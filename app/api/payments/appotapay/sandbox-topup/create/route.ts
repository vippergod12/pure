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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CreateTopupBody = {
  amount?: number | string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  note?: string;
  paymentMethod?: string;
  bankCode?: string;
};

function generateTopupCode(): string {
  return `TOPUP${Date.now()}${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeAmount(value: unknown): number {
  const raw = typeof value === 'string' ? value.replace(/[^\d]/g, '') : value;
  const amount = Math.round(Number(raw));
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeBankCode(value: unknown): string | null {
  const bankCode = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!bankCode) return null;
  if (!/^[A-Z0-9_]{2,40}$/.test(bankCode)) return null;
  return bankCode;
}

function isProductionGateway(gatewayUrl: string): boolean {
  try {
    const host = new URL(gatewayUrl).hostname.toLowerCase();
    return host === 'gateway.appotapay.com';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: CreateTopupBody;
  try {
    body = (await req.json()) as CreateTopupBody;
  } catch {
    return badRequest('Payload không hợp lệ');
  }

  if ((process.env.APPOTAPAY_ENV ?? 'sandbox').trim().toLowerCase() === 'production') {
    return jsonError('Sandbox nạp tiền chỉ được bật khi APPOTAPAY_ENV=sandbox', 403);
  }

  try {
    const config = getAppotaPayConfig();
    if (isProductionGateway(config.gatewayUrl)) {
      return jsonError('Sandbox nạp tiền không được trỏ tới gateway production của AppotaPay', 403);
    }
  } catch (err) {
    if (err instanceof AppotaPayConfigError) return jsonError(err.message, 503);
    throw err;
  }

  const amount = normalizeAmount(body.amount);
  const customerName = cleanText(body.customerName, 160);
  const customerPhone = cleanText(body.customerPhone, 40);
  const customerEmail = cleanText(body.customerEmail, 160) || null;
  const note = cleanText(body.note, 1000) || null;
  const paymentMethod = normalizeAppotaPayPaymentMethod(body.paymentMethod);
  const bankCode = normalizeBankCode(body.bankCode);

  if (amount < 10000 || amount > 50000000) {
    return badRequest('Số tiền nạp sandbox phải từ 10.000đ đến 50.000.000đ');
  }
  if (!customerName) return badRequest('Vui lòng nhập họ tên');
  const phoneDigits = customerPhone.replace(/[^\d]/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return badRequest('Số điện thoại không hợp lệ');
  }
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return badRequest('Email không hợp lệ');
  }

  const topupCode = generateTopupCode();
  const productSnapshot = {
    type: 'sandbox_topup',
    name: 'Nạp tiền sandbox AppotaPay',
    slug: null,
    image_url: null,
    category_name: 'Sandbox',
    unit_price: amount,
    original_price: amount,
    sale_price: null,
  };

  let inserted = false;
  try {
    await sql`
      INSERT INTO orders (
        order_code, product_id, product_snapshot, selected_color, quantity,
        amount, currency, customer_name, customer_phone, customer_email,
        customer_note, payment_provider, payment_method, bank_code, status
      )
      VALUES (
        ${topupCode}, NULL, ${JSON.stringify(productSnapshot)}::jsonb,
        NULL, 1, ${amount}, 'VND', ${customerName}, ${customerPhone},
        ${customerEmail}, ${note}, 'appotapay_sandbox_topup',
        ${paymentMethod}, ${bankCode}, 'created'
      )
    `;
    inserted = true;

    const appotaPay = await createAppotaPayPayment({
      orderCode: topupCode,
      amount,
      orderInfo: `Sandbox top-up ${topupCode}`,
      extraData: 'type=sandbox_topup',
      paymentMethod,
      bankCode,
    });

    const appotaStatus = appotaPay.transaction?.status ?? 'pending';
    const status = mapAppotaPayStatus(appotaStatus);
    const transactionId = appotaPay.transaction?.transactionId ?? null;
    const paymentUrl = appotaPay.payment?.url ?? null;

    await sql`
      UPDATE orders
      SET payment_url = ${paymentUrl},
          provider_transaction_id = ${transactionId},
          status = ${status},
          appotapay_status = ${appotaStatus},
          appotapay_error_code = ${appotaPay.transaction?.errorCode ?? null},
          appotapay_error_message = ${appotaPay.transaction?.errorMessage ?? null},
          appotapay_payload = ${JSON.stringify(appotaPay)}::jsonb,
          updated_at = NOW()
      WHERE order_code = ${topupCode}
    `;

    return jsonOk(
      {
        ok: true,
        topupCode,
        orderCode: topupCode,
        paymentUrl,
        transactionId,
        status,
      },
      { status: 201, cache: 'no-store' },
    );
  } catch (err) {
    if (inserted) {
      const message = err instanceof Error ? err.message : 'Không thể tạo giao dịch nạp tiền sandbox';
      await sql`
        UPDATE orders
        SET status = 'failed',
            appotapay_error_message = ${message},
            updated_at = NOW()
        WHERE order_code = ${topupCode}
      `;
    }

    if (err instanceof AppotaPayConfigError) return jsonError(err.message, 503);
    if (err instanceof AppotaPayGatewayError) return jsonError(err.message, 502);

    const msg = err instanceof Error ? err.message : 'Không thể tạo giao dịch nạp tiền sandbox';
    if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('orders')) {
      return jsonError('Bảng orders chưa tồn tại. Chạy `npm run db:init` để cập nhật schema.', 500);
    }
    return jsonError(msg, 500);
  }
}
