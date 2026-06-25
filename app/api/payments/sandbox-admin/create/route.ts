import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { sql } from '@/lib/server/db';
import { badRequest, jsonError, jsonOk } from '@/lib/server/http';
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

type CreateSandboxAdminBody = {
  productId?: number | string;
  quantity?: number | string;
  color?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNote?: string;
};

function isSandboxEnvironment(): boolean {
  const env = (process.env.APPOTAPAY_ENV ?? 'sandbox').trim().toLowerCase();
  const gatewayUrl = (process.env.APPOTAPAY_GATEWAY_URL ?? '').trim().toLowerCase().replace(/\/+$/, '');
  return env !== 'production' && gatewayUrl !== 'https://gateway.appotapay.com';
}

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
  if (!isSandboxEnvironment()) {
    return jsonError('Kênh admin duyệt thủ công chỉ được bật trong sandbox', 403);
  }

  let body: CreateSandboxAdminBody;
  try {
    body = (await req.json()) as CreateSandboxAdminBody;
  } catch {
    return badRequest('Payload không hợp lệ');
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

  await sql`
    INSERT INTO orders (
      order_code, product_id, product_snapshot, selected_color, quantity,
      amount, currency, customer_name, customer_phone, customer_email,
      customer_note, payment_provider, payment_method, status, admin_note
    )
    VALUES (
      ${orderCode}, ${product.id}, ${JSON.stringify(productSnapshot)}::jsonb,
      ${selectedColor}, ${quantity}, ${amount}, 'VND', ${customerName},
      ${customerPhone}, ${customerEmail}, ${customerNote}, 'sandbox_admin_approve',
      'ADMIN_APPROVAL', 'awaiting_transfer',
      'Sandbox: đơn test chờ admin duyệt thủ công.'
    )
  `;

  const paymentUrl = new URL('/thanh-toan/ket-qua', req.nextUrl.origin);
  paymentUrl.searchParams.set('order', orderCode);
  paymentUrl.searchParams.set('status', 'awaiting_transfer');

  return jsonOk(
    {
      ok: true,
      orderCode,
      paymentUrl: paymentUrl.toString(),
      status: 'awaiting_transfer',
    },
    { status: 201, cache: 'no-store' },
  );
}
