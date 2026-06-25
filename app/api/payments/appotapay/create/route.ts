import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { badRequest, jsonError, jsonOk } from '@/lib/server/http';
import {
  AppotaPayConfigError,
  AppotaPayGatewayError,
  createAppotaPayPayment,
  getAppotaPayConfig,
  mapAppotaPayStatus,
  normalizeAppotaPayPaymentMethod,
} from '@/lib/server/appotapay';
import { getSaleInfo } from '@/lib/utils/sale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProductRow = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  sale_price: number | string | null;
  sale_end_at: string | null;
  image_url: string | null;
  colors: string[];
  is_active: boolean;
  category_name: string | null;
  category_slug: string | null;
};

type CreatePaymentBody = {
  productId?: number | string;
  quantity?: number | string;
  color?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNote?: string;
  paymentMethod?: string;
  bankCode?: string;
};

function generateOrderCode(): string {
  return `PURE${Date.now()}${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeQuantity(value: unknown): number {
  const n = Number(value ?? 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(20, Math.floor(n)));
}

function normalizeBankCode(value: unknown): string | null {
  const bankCode = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!bankCode) return null;
  if (!/^[A-Z0-9_]{2,40}$/.test(bankCode)) return null;
  return bankCode;
}

async function fetchActiveProduct(productId: number): Promise<ProductRow | null> {
  const rows = (await sql`
    SELECT p.id, p.category_id, p.name, p.slug, p.description, p.price,
           p.sale_price, p.sale_end_at, p.image_url, p.colors, p.is_active,
           c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.id = ${productId} AND p.is_active = TRUE
    LIMIT 1
  `) as ProductRow[];
  return rows[0] ?? null;
}

export async function POST(req: NextRequest) {
  let body: CreatePaymentBody;
  try {
    body = (await req.json()) as CreatePaymentBody;
  } catch {
    return badRequest('Payload không hợp lệ');
  }

  try {
    getAppotaPayConfig();
  } catch (err) {
    if (err instanceof AppotaPayConfigError) {
      return jsonError(err.message, 503);
    }
    throw err;
  }

  const productId = Number(body.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return badRequest('Sản phẩm không hợp lệ');
  }

  const quantity = normalizeQuantity(body.quantity);
  const customerName = cleanText(body.customerName, 160);
  const customerPhone = cleanText(body.customerPhone, 40);
  const customerEmail = cleanText(body.customerEmail, 160) || null;
  const customerNote = cleanText(body.customerNote, 1000) || null;
  const selectedColor = cleanText(body.color, 120) || null;
  const paymentMethod = normalizeAppotaPayPaymentMethod(body.paymentMethod);
  const bankCode = normalizeBankCode(body.bankCode);

  if (!customerName) return badRequest('Vui lòng nhập họ tên');
  const phoneDigits = customerPhone.replace(/[^\d]/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return badRequest('Số điện thoại không hợp lệ');
  }
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return badRequest('Email không hợp lệ');
  }

  const product = await fetchActiveProduct(productId);
  if (!product) return jsonError('Sản phẩm không tồn tại hoặc đã hết hàng', 404);

  if (
    selectedColor &&
    Array.isArray(product.colors) &&
    product.colors.length > 0 &&
    !product.colors.includes(selectedColor)
  ) {
    return badRequest('Màu sắc không hợp lệ');
  }

  const sale = getSaleInfo({
    price: Number(product.price),
    sale_price: product.sale_price == null ? null : Number(product.sale_price),
    sale_end_at: product.sale_end_at,
  });
  const amount = Math.round(sale.effectivePrice * quantity);
  if (amount < 1000 || amount > 500000000) {
    return badRequest('Số tiền thanh toán phải từ 1.000đ đến 500.000.000đ');
  }

  const orderCode = generateOrderCode();
  const productSnapshot = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image_url: product.image_url,
    category_name: product.category_name,
    category_slug: product.category_slug,
    unit_price: sale.effectivePrice,
    original_price: sale.originalPrice,
    sale_price: sale.salePrice,
  };

  let insertedOrderId: number | null = null;
  try {
    const insertedRows = (await sql`
      INSERT INTO orders (
        order_code, product_id, product_snapshot, selected_color, quantity,
        amount, currency, customer_name, customer_phone, customer_email,
        customer_note, payment_provider, payment_method, bank_code, status
      )
      VALUES (
        ${orderCode}, ${product.id}, ${JSON.stringify(productSnapshot)}::jsonb,
        ${selectedColor}, ${quantity}, ${amount}, 'VND', ${customerName},
        ${customerPhone}, ${customerEmail}, ${customerNote}, 'appotapay',
        ${paymentMethod}, ${bankCode}, 'pending'
      )
      RETURNING id
    `) as { id: number }[];
    insertedOrderId = insertedRows[0]?.id ?? null;
    if (!insertedOrderId) {
      throw new Error('Khong the xac nhan record don hang sau khi tao');
    }

    const appotaPay = await createAppotaPayPayment({
      orderCode,
      amount,
      orderInfo: `${product.name} x${quantity}`,
      extraData: selectedColor ? `color=${selectedColor}` : '',
      paymentMethod,
      bankCode,
    });

    const appotaStatus = appotaPay.transaction?.status ?? 'pending';
    const status = mapAppotaPayStatus(appotaStatus);
    const transactionId = appotaPay.transaction?.transactionId ?? null;
    const paymentUrl = appotaPay.payment?.url ?? null;

    const updatedRows = (await sql`
      UPDATE orders
      SET payment_url = ${paymentUrl},
          provider_transaction_id = ${transactionId},
          status = ${status},
          appotapay_status = ${appotaStatus},
          appotapay_error_code = ${appotaPay.transaction?.errorCode ?? null},
          appotapay_error_message = ${appotaPay.transaction?.errorMessage ?? null},
          appotapay_payload = ${JSON.stringify(appotaPay)}::jsonb,
          updated_at = NOW()
      WHERE order_code = ${orderCode}
      RETURNING id
    `) as { id: number }[];

    if (!updatedRows[0]?.id) {
      throw new Error('Khong the xac nhan record don hang sau khi cap nhat AppotaPay');
    }

    return jsonOk(
      {
        ok: true,
        saved: true,
        orderId: updatedRows[0].id,
        orderCode,
        paymentUrl,
        transactionId,
        status,
      },
      { status: 201, cache: 'no-store' },
    );
  } catch (err) {
    if (insertedOrderId !== null) {
      const message = err instanceof Error ? err.message : 'Không thể tạo thanh toán AppotaPay';
      await sql`
        UPDATE orders
        SET status = 'failed',
            appotapay_error_message = ${message},
            updated_at = NOW()
        WHERE order_code = ${orderCode}
      `;
    }

    if (err instanceof AppotaPayConfigError) return jsonError(err.message, 503);
    if (err instanceof AppotaPayGatewayError) return jsonError(err.message, 502);

    const msg = err instanceof Error ? err.message : 'Không thể tạo thanh toán';
    if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('orders')) {
      return jsonError('Bảng orders chưa tồn tại. Chạy `npm run db:init` để cập nhật schema.', 500);
    }
    return jsonError(msg, 500);
  }
}
