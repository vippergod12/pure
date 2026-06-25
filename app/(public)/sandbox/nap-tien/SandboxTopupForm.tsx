'use client';

import { useState } from 'react';
import { formatVnd } from '@/lib/utils/format';

type AppotaPayMethod = 'ALL' | 'ATM' | 'CC' | 'EWALLET';

const AMOUNT_PRESETS = [10000, 50000, 100000, 200000, 500000, 1000000];

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

export default function SandboxTopupForm() {
  const [amount, setAmount] = useState(100000);
  const [customerName, setCustomerName] = useState('Sandbox Tester');
  const [customerPhone, setCustomerPhone] = useState('0900000000');
  const [customerEmail, setCustomerEmail] = useState('');
  const [note, setNote] = useState('Test nạp tiền AppotaPay sandbox');
  const [paymentMethod, setPaymentMethod] = useState<AppotaPayMethod>('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/appotapay/sandbox-topup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          customerName,
          customerPhone,
          customerEmail,
          note,
          paymentMethod,
        }),
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) throw new Error(readError(data, 'Không thể tạo giao dịch nạp tiền sandbox'));
      const paymentUrl =
        data && typeof data === 'object' && 'paymentUrl' in data
          ? String((data as { paymentUrl?: unknown }).paymentUrl || '')
          : '';
      if (!paymentUrl) throw new Error('Không nhận được link thanh toán AppotaPay');
      window.location.assign(paymentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo giao dịch nạp tiền sandbox');
      setSubmitting(false);
    }
  }

  return (
    <div className="sandbox-topup-grid">
      <form className="checkout-form sandbox-topup-form" onSubmit={onSubmit}>
        <div className="checkout-form-head">
          <span className="checkout-eyebrow">AppotaPay sandbox</span>
          <h1>Nạp tiền test</h1>
        </div>

        <div className="sandbox-amount-presets" aria-label="Chọn nhanh số tiền">
          {AMOUNT_PRESETS.map((item) => (
            <button
              key={item}
              type="button"
              className={amount === item ? 'is-active' : ''}
              onClick={() => setAmount(item)}
            >
              {formatVnd(item)}
            </button>
          ))}
        </div>

        <div className="checkout-fields">
          <label className="checkout-field">
            <span>Số tiền</span>
            <input
              type="number"
              min={10000}
              max={50000000}
              step={10000}
              value={amount}
              onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))}
              required
            />
          </label>

          <label className="checkout-field">
            <span>Phương thức</span>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as AppotaPayMethod)}
            >
              {APPOTAPAY_METHODS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="checkout-field">
            <span>Họ tên</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              maxLength={160}
              required
            />
          </label>

          <label className="checkout-field">
            <span>Số điện thoại</span>
            <input
              type="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              maxLength={40}
              required
            />
          </label>

          <label className="checkout-field">
            <span>Email</span>
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              maxLength={160}
            />
          </label>

          <label className="checkout-field checkout-field-wide">
            <span>Ghi chú</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              maxLength={1000}
            />
          </label>
        </div>

        {error && <div className="checkout-error" role="alert">{error}</div>}

        <button className="btn btn-primary checkout-submit" type="submit" disabled={submitting}>
          {submitting ? 'Đang chuyển sang AppotaPay...' : `Nạp test ${formatVnd(amount)}`}
        </button>
      </form>

      <aside className="sandbox-topup-summary">
        <span className="checkout-eyebrow">Sandbox only</span>
        <h2>{formatVnd(amount)}</h2>
        <p>
          Giao dịch này dùng để test cổng AppotaPay sandbox. Khi AppotaPay trả IPN hoặc redirect hợp lệ,
          hệ thống sẽ cập nhật trạng thái trong bảng đơn hàng với mã bắt đầu bằng TOPUP.
        </p>
        <dl>
          <div>
            <dt>Provider</dt>
            <dd>AppotaPay sandbox</dd>
          </div>
          <div>
            <dt>Trạng thái ban đầu</dt>
            <dd>pending / processing</dd>
          </div>
          <div>
            <dt>Sau khi thành công</dt>
            <dd>paid + paid_at</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
