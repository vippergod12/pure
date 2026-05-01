import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty-state" style={{ padding: '64px 16px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: 8 }}>404 — Không tìm thấy</h1>
        <p style={{ marginBottom: 16 }}>
          Trang bạn truy cập không tồn tại hoặc đã bị xoá.
        </p>
        <Link href="/" className="btn btn-primary">
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}
