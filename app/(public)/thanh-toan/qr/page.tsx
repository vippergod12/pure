import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/server/db';
import { getManualQrConfig, normalizeManualQrProvider } from '@/lib/server/manual-qr';
import { formatDate, formatVnd } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quét QR thanh toán',
  robots: { index: false, follow: false },
};

type SearchParams = {
  order?: string | string[];
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
  customer_name: string;
  payment_provider: string;
  payment_method: string;
  status: string;
  created_at: string;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function fetchOrder(orderCode: string | null): Promise<OrderRow | null> {
  if (!orderCode) return null;
  const rows = (await sql`
    SELECT order_code, product_snapshot, selected_color, quantity, amount,
           customer_name, payment_provider, payment_method, status, created_at
    FROM orders
    WHERE order_code = ${orderCode}
    LIMIT 1
  `) as OrderRow[];
  return rows[0] ?? null;
}

export default async function ManualQrPaymentPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const orderCode = firstParam(searchParams?.order);
  const order = await fetchOrder(orderCode).catch(() => null);
  const provider = normalizeManualQrProvider(order?.payment_provider);
  const config = provider ? getManualQrConfig(provider) : null;
  const product = order?.product_snapshot ?? {};

  if (!order || !config) {
    return (
      <section className="section payment-result-page">
        <div className="container payment-result-container">
          <div className="payment-result-panel is-failed">
            <span className="checkout-eyebrow">Thanh toán QR</span>
            <h1>Không tìm thấy đơn QR</h1>
            <p>Đơn hàng không tồn tại hoặc không phải phương thức MoMo/ZaloPay QR.</p>
            <div className="payment-result-actions">
              <Link className="btn btn-primary" href="/cua-hang">
                Về cửa hàng
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section manual-qr-page">
      <div className="container manual-qr-container">
        <div className="manual-qr-panel">
          <div className="manual-qr-main">
            <span className="checkout-eyebrow">{config.label}</span>
            <h1>Quét QR để thanh toán</h1>
            <p>
              Vui lòng chuyển đúng số tiền và nhập mã đơn ở nội dung thanh toán để shop
              đối soát nhanh hơn.
            </p>

            <div className="manual-qr-image-wrap">
              <img className="manual-qr-image" src={config.qrImageUrl} alt={`QR ${config.label}`} />
            </div>
          </div>

          <aside className="manual-qr-summary" aria-label="Thông tin thanh toán QR">
            <h2>{product.name ?? 'Đơn hàng PURE'}</h2>
            <dl>
              <div className="manual-qr-amount">
                <dt>Số tiền</dt>
                <dd>{formatVnd(order.amount)}</dd>
              </div>
              <div>
                <dt>Nội dung</dt>
                <dd>{order.order_code}</dd>
              </div>
              <div>
                <dt>Người nhận</dt>
                <dd>{config.receiverName || 'Theo mã QR'}</dd>
              </div>
              {config.receiverAccount && (
                <div>
                  <dt>Tài khoản/SĐT</dt>
                  <dd>{config.receiverAccount}</dd>
                </div>
              )}
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
                <dt>Ngày tạo</dt>
                <dd>{formatDate(order.created_at)}</dd>
              </div>
            </dl>

            <div className="manual-qr-note">
              Sau khi chuyển khoản, đơn hàng sẽ ở trạng thái chờ xác nhận. Shop sẽ kiểm
              tra giao dịch và liên hệ lại với bạn.
            </div>

            <div className="payment-result-actions">
              <Link
                className="btn btn-primary"
                href={`/thanh-toan/ket-qua?order=${encodeURIComponent(order.order_code)}&status=awaiting_transfer`}
              >
                Tôi đã chuyển khoản
              </Link>
              <Link className="btn btn-ghost" href="/tu-van">
                Liên hệ shop
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
