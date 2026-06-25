import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { badRequest, jsonError, jsonOk } from '@/lib/server/http';
import {
  MomoConfigError,
  MomoGatewayError,
  createMomoPayment,
  encodeMomoExtraData,
  getMomoConfig,
} from '@/lib/server/momo';
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

type CreateMomoBody = {
  productId?: number | string;
  quantity?: number | string;
  color?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNote?: string;
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
  let body: CreateMomoBody;
  try {
    body = (await req.json()) as CreateMomoBody;
  } catch {
    return badRequest('Payload khong hop le');
  }

  try {
    getMomoConfig();
  } catch (err) {
    if (err instanceof MomoConfigError) return jsonError(err.message, 503);
    throw err;
  }

  const productId = Number(body.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return badRequest('San pham khong hop le');
  }

  const quantity = normalizeQuantity(body.quantity);
  const customerName = cleanText(body.customerName, 160);
  const customerPhone = cleanText(body.customerPhone, 40);
  const customerEmail = cleanText(body.customerEmail, 160) || null;
  const customerNote = cleanText(body.customerNote, 1000) || null;
  const selectedColor = cleanText(body.color, 120) || null;

  if (!customerName) return badRequest('Vui long nhap ho ten');
  const phoneDigits = customerPhone.replace(/[^\d]/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return badRequest('So dien thoai khong hop le');
  }
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return badRequest('Email khong hop le');
  }

  const product = await fetchActiveProduct(productId);
  if (!product) return jsonError('San pham khong ton tai hoac da het hang', 404);

  if (
    selectedColor &&
    Array.isArray(product.colors) &&
    product.colors.length > 0 &&
    !product.colors.includes(selectedColor)
  ) {
    return badRequest('Mau sac khong hop le');
  }

  const sale = getSaleInfo({
    price: Number(product.price),
    sale_price: product.sale_price == null ? null : Number(product.sale_price),
    sale_end_at: product.sale_end_at,
  });
  const amount = Math.round(sale.effectivePrice * quantity);
  if (amount < 1000 || amount > 50000000) {
    return badRequest('So tien thanh toan MoMo phai tu 1.000d den 50.000.000d');
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
  const extraData = encodeMomoExtraData({
    orderCode,
    productId: product.id,
    quantity,
    color: selectedColor,
  });

  let inserted = false;
  try {
    await sql`
      INSERT INTO orders (
        order_code, product_id, product_snapshot, selected_color, quantity,
        amount, currency, customer_name, customer_phone, customer_email,
        customer_note, payment_provider, payment_method, status
      )
      VALUES (
        ${orderCode}, ${product.id}, ${JSON.stringify(productSnapshot)}::jsonb,
        ${selectedColor}, ${quantity}, ${amount}, 'VND', ${customerName},
        ${customerPhone}, ${customerEmail}, ${customerNote}, 'momo',
        'MOMO_WALLET', 'created'
      )
    `;
    inserted = true;

    const momo = await createMomoPayment({
      orderCode,
      amount,
      orderInfo: `${product.name} x${quantity}`,
      extraData,
      customerName,
      customerPhone,
      customerEmail,
    });

    const paymentUrl = momo.payUrl ?? momo.deeplink ?? null;
    const requestId = momo.requestId ?? null;

    await sql`
      UPDATE orders
      SET payment_url = ${paymentUrl},
          status = 'pending',
          momo_result_code = ${momo.resultCode ?? null},
          momo_message = ${momo.message ?? null},
          momo_request_id = ${requestId},
          momo_payload = ${JSON.stringify(momo)}::jsonb,
          updated_at = NOW()
      WHERE order_code = ${orderCode}
    `;

    return jsonOk(
      {
        ok: true,
        orderCode,
        paymentUrl,
        requestId,
        status: 'pending',
      },
      { status: 201, cache: 'no-store' },
    );
  } catch (err) {
    if (inserted) {
      const message = err instanceof Error ? err.message : 'Khong the tao thanh toan MoMo';
      await sql`
        UPDATE orders
        SET status = 'failed',
            momo_message = ${message},
            updated_at = NOW()
        WHERE order_code = ${orderCode}
      `;
    }

    if (err instanceof MomoConfigError) return jsonError(err.message, 503);
    if (err instanceof MomoGatewayError) return jsonError(err.message, 502);

    const msg = err instanceof Error ? err.message : 'Khong the tao thanh toan MoMo';
    if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('orders')) {
      return jsonError('Bang orders chua ton tai. Chay `npm run db:init` de cap nhat schema.', 500);
    }
    return jsonError(msg, 500);
  }
}
