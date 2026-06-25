'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  orderCode: string;
  label?: string;
};

function readError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data) {
    return String((data as { message?: unknown }).message || fallback);
  }
  return fallback;
}

export default function SandboxCompleteButton({
  orderCode,
  label = 'Giả lập thanh toán thành công',
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/appotapay/sandbox-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(readError(data, 'Không thể giả lập thanh toán thành công'));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể giả lập thanh toán thành công');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sandbox-complete">
      <button type="button" className="btn btn-primary" onClick={onClick} disabled={submitting}>
        {submitting ? 'Đang cập nhật...' : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
