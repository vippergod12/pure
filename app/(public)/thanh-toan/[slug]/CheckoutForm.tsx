'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { formatVnd } from '@/lib/utils/format';
import { getSaleInfo } from '@/lib/utils/sale';

type PaymentRail = 'appotapay' | 'sandbox_admin_approve' | 'momo' | 'momo_qr' | 'zalopay_qr';
type AppotaPayMethod = 'ALL' | 'ATM' | 'CC' | 'EWALLET';
type AppotaPayEnvironment = 'sandbox' | 'production';

interface Props {
  product: Product;
  initialColor: string | null;
  appotaPayEnvironment: AppotaPayEnvironment;
}

const PAYMENT_RAILS: Array<{ value: PaymentRail; label: string; hint: string }> = [
  {
    value: 'appotapay',
    label: 'AppotaPay',
    hint: 'Tự động chuyển sang cổng AppotaPay để thanh toán.',
  },
  {
    value: 'momo',
    label: 'MoMo Merchant',
    hint: 'Thanh toán qua API MoMo chính thức và tự động cập nhật khi IPN thành công.',
  },
  {
    value: 'momo_qr',
    label: 'MoMo QR',
    hint: 'Tạo đơn và hiển thị QR MoMo để shop xác nhận thủ công.',
  },
  {
    value: 'zalopay_qr',
    label: 'ZaloPay QR',
    hint: 'Tạo đơn và hiển thị QR ZaloPay để shop xác nhận thủ công.',
  },
];

const APPOTAPAY_METHODS: Array<{ value: AppotaPayMethod; label: string }> = [
  { value: 'ALL', label: 'Tất cả phương thức' },
  { value: 'ATM', label: 'ATM / iBanking' },
  { value: 'CC', label: 'Visa / Master / JCB' },
  { value: 'EWALLET', label: 'Ví điện tử' },
];

function readError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data) {
    return String((data as { message?: unknown }).message || fallback);
  }
  return fallback;
}

export default function CheckoutForm({ product, initialColor, appotaPayEnvironment }: Props) {
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const sale = useMemo(() => getSaleInfo(product), [product]);
  const isAppotaPaySandbox = appotaPayEnvironment === 'sandbox';
  const paymentRails = useMemo(
    () => {
      const rails = PAYMENT_RAILS.map((item) =>
        item.value === 'appotapay' && isAppotaPaySandbox
          ? {
              ...item,
              label: 'AppotaPay Sandbox',
              hint: 'Tạo giao dịch test qua gateway sandbox AppotaPay, không trừ tiền thật.',
            }
          : item,
      );
      if (isAppotaPaySandbox) {
        rails.splice(1, 0, {
          value: 'sandbox_admin_approve',
          label: 'Admin duyệt (test)',
          hint: 'Tạo đơn chờ xác nhận thủ công để test flow admin approve thành công.',
        });
      }
      return rails;
    },
    [isAppotaPaySandbox],
  );
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState<string>(() => {
    if (initialColor && colors.includes(initialColor)) return initialColor;
    return colors.length === 1 ? colors[0] : '';
  });
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentRail, setPaymentRail] = useState<PaymentRail>('appotapay');
  const [appotaPayMethod, setAppotaPayMethod] = useState<AppotaPayMethod>('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Math.round(sale.effectivePrice * quantity);
  const selectedRail = paymentRails.find((item) => item.value === paymentRail) ?? paymentRails[0];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const isManualQr = paymentRail === 'momo_qr' || paymentRail === 'zalopay_qr';
      const endpoint =
        paymentRail === 'appotapay'
          ? '/api/payments/appotapay/create'
          : paymentRail === 'sandbox_admin_approve'
            ? '/api/payments/sandbox-admin/create'
          : paymentRail === 'momo'
            ? '/api/payments/momo/create'
            : '/api/payments/manual-qr/create';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: isManualQr ? paymentRail : undefined,
          productId: product.id,
          quantity,
          color: color || null,
          customerName,
          customerPhone,
          customerEmail,
          customerNote,
          paymentMethod: paymentRail === 'appotapay' ? appotaPayMethod : undefined,
        }),
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) throw new Error(readError(data, 'Không thể tạo thanh toán'));
      const paymentUrl =
        data && typeof data === 'object' && 'paymentUrl' in data
          ? String((data as { paymentUrl?: unknown }).paymentUrl || '')
          : '';
      if (!paymentUrl) throw new Error('Không nhận được link thanh toán');
      window.location.assign(paymentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo thanh toán');
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-grid">
      <form className="checkout-form" onSubmit={onSubmit}>
        <div className="checkout-form-head">
          <span className="checkout-eyebrow">
            {isAppotaPaySandbox ? 'Thanh toán sandbox' : 'Thanh toán online'}
          </span>
          <h1>Thông tin đặt hàng</h1>
        </div>

        <div className="checkout-fields">
          <label className="checkout-field">
            <span>Họ tên</span>
            <input
              type="text"
              name="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
              required
              maxLength={160}
            />
          </label>

          <label className="checkout-field">
            <span>Số điện thoại</span>
            <input
              type="tel"
              name="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              autoComplete="tel"
              required
              maxLength={40}
            />
          </label>

          <label className="checkout-field">
            <span>Email</span>
            <input
              type="email"
              name="customerEmail"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              autoComplete="email"
              maxLength={160}
            />
          </label>

          <label className="checkout-field">
            <span>Số lượng</span>
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              required
            />
          </label>

          {colors.length > 0 && (
            <label className="checkout-field">
              <span>Màu sắc</span>
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                {colors.length > 1 && <option value="">Chọn màu</option>}
                {colors.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="checkout-field">
            <span>Kênh thanh toán</span>
            <select
              value={paymentRail}
              onChange={(e) => setPaymentRail(e.target.value as PaymentRail)}
            >
              {paymentRails.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <em className="checkout-field-hint">{selectedRail.hint}</em>
          </label>

          {paymentRail === 'appotapay' && (
            <label className="checkout-field">
              <span>Phương thức AppotaPay</span>
              <select
                value={appotaPayMethod}
                onChange={(e) => setAppotaPayMethod(e.target.value as AppotaPayMethod)}
              >
                {APPOTAPAY_METHODS.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {paymentRail === 'appotapay' && isAppotaPaySandbox && (
            <div className="checkout-sandbox-note checkout-field-wide">
              <strong>AppotaPay sandbox đang bật</strong>
              <p>
                Giao dịch sản phẩm này chạy trên môi trường test. Dùng dữ liệu test trên cổng
                AppotaPay và không nhập thẻ ngân hàng thật.
              </p>
              <dl>
                <div>
                  <dt>ATM test</dt>
                  <dd>MB - 9704229306604047 - ARTURO MOEN - 01/23 - OTP 123456</dd>
                </div>
                <div>
                  <dt>Tài khoản test</dt>
                  <dd>PVBANK - 01040001 - NGUYEN VAN A - OTP otp</dd>
                </div>
              </dl>
            </div>
          )}

          {paymentRail === 'sandbox_admin_approve' && (
            <div className="checkout-sandbox-note checkout-field-wide">
              <strong>Flow admin duyệt thủ công</strong>
              <p>
                Hệ thống sẽ tạo đơn ở trạng thái chờ xác nhận. Sau đó vào admin/orders, chọn đơn
                và đổi trạng thái sang Đã thanh toán để test bước duyệt thành công.
              </p>
            </div>
          )}

          <label className="checkout-field checkout-field-wide">
            <span>Ghi chú</span>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={4}
              maxLength={1000}
            />
          </label>
        </div>

        {error && (
          <div className="checkout-error" role="alert">
            {error}
          </div>
        )}

        <button className="btn btn-primary checkout-submit" type="submit" disabled={submitting}>
          {submitting
            ? paymentRail === 'appotapay'
              ? 'Đang chuyển sang AppotaPay...'
              : paymentRail === 'sandbox_admin_approve'
                ? 'Đang tạo đơn chờ duyệt...'
              : paymentRail === 'momo'
                ? 'Đang chuyển sang MoMo...'
              : 'Đang tạo mã QR...'
            : paymentRail === 'momo_qr' || paymentRail === 'zalopay_qr'
              ? `Tạo QR ${formatVnd(total)}`
              : paymentRail === 'sandbox_admin_approve'
                ? `Tạo đơn chờ admin duyệt ${formatVnd(total)}`
              : paymentRail === 'appotapay'
              ? `${isAppotaPaySandbox ? 'Test AppotaPay sandbox' : 'Thanh toán'} ${formatVnd(total)}`
              : `Thanh toán MoMo ${formatVnd(total)}`}
        </button>
      </form>

      <aside className="checkout-summary" aria-label="Tóm tắt đơn hàng">
        <div className="checkout-summary-media">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 960px) 100vw, 360px"
            />
          ) : (
            <div className="product-card-placeholder">No image</div>
          )}
        </div>
        <div className="checkout-summary-body">
          <span className="checkout-summary-category">{product.category_name}</span>
          <h2>{product.name}</h2>
          <dl className="checkout-summary-lines">
            <div>
              <dt>Đơn giá</dt>
              <dd>{formatVnd(sale.effectivePrice)}</dd>
            </div>
            <div>
              <dt>Số lượng</dt>
              <dd>{quantity}</dd>
            </div>
            {color && (
              <div>
                <dt>Màu sắc</dt>
                <dd>{color}</dd>
              </div>
            )}
            <div className="checkout-summary-total">
              <dt>Tổng cộng</dt>
              <dd>{formatVnd(total)}</dd>
            </div>
            <div>
              <dt>Thanh toán</dt>
              <dd>{selectedRail.label}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
