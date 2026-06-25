import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import OrderRefreshNotifier from '@/components/OrderRefreshNotifier';
import SandboxCompleteButton from '@/components/SandboxCompleteButton';
import { sql } from '@/lib/server/db';
import { applyAppotaPayCallback } from '@/lib/server/payment-orders';
import { formatDate, formatVnd } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kết quả thanh toán',
  robots: { index: false, follow: false },
};

type SearchParams = {
  order?: string | string[];
  status?: string | string[];
  error?: string | string[];
  data?: string | string[];
  signature?: string | string[];
};

type ProductSnapshot = {
  name?: string;
  slug?: string;
  image_url?: string | null;
  category_name?: string | null;
};

type OrderRow = {
  order_code: string;
  product_snapshot: ProductSnapshot;
  selected_color: string | null;
  quantity: number;
  amount: number | string;
  currency: string;
  customer_name: string;
  payment_provider: string;
  payment_method: string;
  provider_transaction_id: string | null;
  status: string;
  appotapay_status: string | null;
  appotapay_error_message: string | null;
  momo_message: string | null;
  paid_at: string | null;
  created_at: string;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isAppotaPaySandbox(): boolean {
  const env = (process.env.APPOTAPAY_ENV ?? 'sandbox').trim().toLowerCase();
  const gatewayUrl = (process.env.APPOTAPAY_GATEWAY_URL ?? '').trim().toLowerCase().replace(/\/+$/, '');
  return env !== 'production' && gatewayUrl !== 'https://gateway.appotapay.com';
}

function statusCopy(status: string | null, error: string | null) {
  if (status === 'paid') {
    return {
      tone: 'success',
      title: 'Thanh toán thành công',
      body: 'Đơn hàng đã được ghi nhận. Shop sẽ liên hệ để xác nhận giao hàng.',
    };
  }
  if (status === 'pending' || status === 'processing') {
    return {
      tone: 'pending',
      title: 'Thanh toán đang xử lý',
      body: 'Giao dịch đang chờ xác nhận từ cổng thanh toán.',
    };
  }
  if (status === 'awaiting_transfer') {
    return {
      tone: 'pending',
      title: 'Đơn hàng đang chờ admin xác nhận',
      body: 'Đây là flow duyệt thủ công. Admin cần kiểm tra đơn và đổi trạng thái sang Đã thanh toán.',
    };
  }
  return {
    tone: 'failed',
    title: 'Thanh toán chưa hoàn tất',
    body: error || 'Giao dịch chưa được xác nhận thành công.',
  };
}

async function fetchOrder(orderCode: string | null): Promise<OrderRow | null> {
  if (!orderCode) return null;
  const rows = (await sql`
    SELECT order_code, product_snapshot, selected_color, quantity, amount, currency,
           customer_name, payment_provider, payment_method, provider_transaction_id, status,
           appotapay_status, appotapay_error_message, momo_message, paid_at, created_at
    FROM orders
    WHERE order_code = ${orderCode}
    LIMIT 1
  `) as OrderRow[];
  return rows[0] ?? null;
}

export default async function PaymentResultPage({ searchParams }: { searchParams?: SearchParams }) {
  let orderCode = firstParam(searchParams?.order);
  let fallbackStatus = firstParam(searchParams?.status);
  let fallbackError = firstParam(searchParams?.error);
  const data = firstParam(searchParams?.data);
  const signature = firstParam(searchParams?.signature);

  if (data && signature) {
    const result = await applyAppotaPayCallback({ data, signature });
    orderCode = result.orderCode ?? orderCode;
    fallbackStatus = result.status ?? fallbackStatus;
    fallbackError = result.ok ? fallbackError : result.reason ?? fallbackError;

    if (result.orderCode?.startsWith('TOPUP')) {
      const target = new URL('/sandbox/nap-tien/ket-qua', 'http://localhost');
      target.searchParams.set('order', result.orderCode);
      if (result.status) target.searchParams.set('status', result.status);
      if (!result.ok && result.reason) target.searchParams.set('error', result.reason.slice(0, 140));
      redirect(`${target.pathname}?${target.searchParams.toString()}`);
    }
  }

  const order = await fetchOrder(orderCode).catch(() => null);
  const product = order?.product_snapshot ?? {};
  const providerError =
    order?.payment_provider === 'momo' ? order.momo_message : order?.appotapay_error_message;
  const missingOrderError = orderCode ? `Không tìm thấy đơn ${orderCode} trong hệ thống.` : null;
  const displayStatus = order ? order.status : orderCode ? null : fallbackStatus;
  const copy = statusCopy(displayStatus, providerError ?? missingOrderError ?? fallbackError);
  const transactionLabel = order?.payment_provider === 'momo' ? 'Mã MoMo' : 'Mã AppotaPay';
  const canSandboxComplete =
    isAppotaPaySandbox() && order?.payment_provider === 'appotapay' && order.status !== 'paid';

  return (
    <section className="section payment-result-page">
      <div className="container payment-result-container">
        <div className={`payment-result-panel is-${copy.tone}`}>
          {order && <OrderRefreshNotifier orderCode={order.order_code} status={order.status} />}
          <span className="checkout-eyebrow">Kết quả thanh toán</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>

          {order ? (
            <div className="payment-result-order">
              {product.image_url && (
                <div className="payment-result-media">
                  <Image
                    src={product.image_url}
                    alt={product.name ?? order.order_code}
                    fill
                    sizes="96px"
                  />
                </div>
              )}
              <div className="payment-result-details">
                <h2>{product.name ?? 'Đơn hàng PURE'}</h2>
                <dl>
                  <div>
                    <dt>Mã đơn</dt>
                    <dd>{order.order_code}</dd>
                  </div>
                  <div>
                    <dt>Tổng tiền</dt>
                    <dd>{formatVnd(order.amount)}</dd>
                  </div>
                  <div>
                    <dt>Số lượng</dt>
                    <dd>{order.quantity}</dd>
                  </div>
                  {order.selected_color && (
                    <div>
                      <dt>Màu sắc</dt>
                      <dd>{order.selected_color}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Phương thức</dt>
                    <dd>{order.payment_method}</dd>
                  </div>
                  {order.provider_transaction_id && (
                    <div>
                      <dt>{transactionLabel}</dt>
                      <dd>{order.provider_transaction_id}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Thời gian</dt>
                    <dd>{formatDate(order.paid_at ?? order.created_at)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <div className="payment-result-empty">
              Không tìm thấy đơn hàng để hiển thị.
            </div>
          )}

          <div className="payment-result-actions">
            {canSandboxComplete && (
              <SandboxCompleteButton orderCode={order.order_code} />
            )}
            {product.slug ? (
              <Link className="btn btn-primary" href={`/san-pham/${product.slug}`}>
                Xem lại sản phẩm
              </Link>
            ) : (
              <Link className="btn btn-primary" href="/cua-hang">
                Về cửa hàng
              </Link>
            )}
            <Link className="btn btn-ghost" href="/tu-van">
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
