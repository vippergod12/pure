import type { Metadata } from 'next';
import Link from 'next/link';
import SandboxCompleteButton from '@/components/SandboxCompleteButton';
import { sql } from '@/lib/server/db';
import { formatDate, formatVnd } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kết quả nạp tiền sandbox',
  robots: { index: false, follow: false },
};

type SearchParams = {
  order?: string | string[];
  status?: string | string[];
  error?: string | string[];
};

type TopupRow = {
  order_code: string;
  amount: number | string;
  currency: string;
  customer_name: string;
  payment_method: string;
  provider_transaction_id: string | null;
  status: string;
  appotapay_status: string | null;
  appotapay_error_message: string | null;
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
      title: 'Nạp tiền sandbox thành công',
      body: 'AppotaPay đã xác nhận giao dịch. Record TOPUP đã được cập nhật paid.',
    };
  }
  if (status === 'pending' || status === 'processing') {
    return {
      tone: 'pending',
      title: 'Giao dịch đang xử lý',
      body: 'AppotaPay chưa trả xác nhận thành công. Bạn có thể tải lại trang sau khi IPN về.',
    };
  }
  return {
    tone: 'failed',
    title: 'Nạp tiền sandbox chưa hoàn tất',
    body: error || 'Giao dịch chưa được xác nhận thành công.',
  };
}

async function fetchTopup(orderCode: string | null): Promise<TopupRow | null> {
  if (!orderCode || !orderCode.startsWith('TOPUP')) return null;
  const rows = (await sql`
    SELECT order_code, amount, currency, customer_name, payment_method,
           provider_transaction_id, status, appotapay_status,
           appotapay_error_message, paid_at, created_at
    FROM orders
    WHERE order_code = ${orderCode}
      AND payment_provider = 'appotapay_sandbox_topup'
    LIMIT 1
  `) as TopupRow[];
  return rows[0] ?? null;
}

export default async function SandboxTopupResultPage({ searchParams }: { searchParams?: SearchParams }) {
  const orderCode = firstParam(searchParams?.order);
  const fallbackStatus = firstParam(searchParams?.status);
  const fallbackError = firstParam(searchParams?.error);
  const topup = await fetchTopup(orderCode).catch(() => null);
  const copy = statusCopy(topup?.status ?? fallbackStatus, topup?.appotapay_error_message ?? fallbackError);
  const canSandboxComplete = isAppotaPaySandbox() && topup !== null && topup.status !== 'paid';

  return (
    <section className="section payment-result-page sandbox-topup-result-page">
      <div className="container payment-result-container">
        <div className={`payment-result-panel is-${copy.tone}`}>
          <span className="checkout-eyebrow">AppotaPay sandbox</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>

          {topup ? (
            <div className="sandbox-topup-result-card">
              <dl>
                <div>
                  <dt>Mã TOPUP</dt>
                  <dd>{topup.order_code}</dd>
                </div>
                <div>
                  <dt>Số tiền</dt>
                  <dd>{formatVnd(topup.amount)}</dd>
                </div>
                <div>
                  <dt>Người test</dt>
                  <dd>{topup.customer_name}</dd>
                </div>
                <div>
                  <dt>Phương thức</dt>
                  <dd>{topup.payment_method}</dd>
                </div>
                {topup.provider_transaction_id && (
                  <div>
                    <dt>Mã AppotaPay</dt>
                    <dd>{topup.provider_transaction_id}</dd>
                  </div>
                )}
                <div>
                  <dt>Thời gian</dt>
                  <dd>{formatDate(topup.paid_at ?? topup.created_at)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="payment-result-empty">
              Không tìm thấy giao dịch nạp tiền sandbox.
            </div>
          )}

          <div className="payment-result-actions">
            {canSandboxComplete && (
              <SandboxCompleteButton
                orderCode={topup.order_code}
                label="Giả lập nạp tiền thành công"
              />
            )}
            <Link className="btn btn-primary" href="/sandbox/nap-tien">
              Tạo giao dịch khác
            </Link>
            <Link className="btn btn-ghost" href="/admin/orders">
              Xem trong admin
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
