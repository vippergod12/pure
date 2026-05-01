'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const { login, username } = useAuth();
  const router = useRouter();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (username) router.replace('/admin');
  }, [username, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(u.trim(), p);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Link href="/" className="login-back">← Về trang chủ</Link>
        <h1>Đăng nhập admin</h1>
        <p className="login-sub">Chỉ admin mới được thêm/sửa/xoá sản phẩm.</p>
        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <span>Tên đăng nhập</span>
            <input
              type="text"
              autoComplete="username"
              value={u}
              onChange={(e) => setU(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input
              type="password"
              autoComplete="current-password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              required
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
