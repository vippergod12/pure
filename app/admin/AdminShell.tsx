'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

const NAV_ITEMS = [
  { href: '/admin/categories', label: 'Danh mục' },
  { href: '/admin/products', label: 'Sản phẩm' },
  { href: '/admin/featured', label: 'Tiêu biểu' },
  { href: '/admin/consultations', label: 'Liên hệ' },
];

/**
 * Wrapper cho toàn bộ /admin/*:
 *  - Tự redirect về /admin/login nếu chưa đăng nhập (trừ chính trang login).
 *  - Render sidebar + main area với responsive sidebar mobile.
 *
 * Vì auth dùng localStorage JWT, kiểm tra phải xảy ra ở client → component này
 * có 'use client' và bọc toàn bộ /admin layer.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { username, logout, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  // Redirect về login khi chưa đăng nhập
  useEffect(() => {
    if (loading) return;
    if (!username && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [loading, username, isLoginPage, router]);

  // Đổi route -> đóng sidebar (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Khoá scroll body khi sidebar mở (mobile)
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  // Trang login render thẳng, không cần sidebar / guard
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading auth state hoặc đang chuẩn bị redirect
  if (loading || !username) {
    return <div className="page-loading">Đang tải...</div>;
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className={`admin-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div
        className="admin-backdrop"
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />

      <button
        type="button"
        className="admin-sidebar-toggle"
        aria-label={sidebarOpen ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((v) => !v)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <Link href="/" className="admin-brand" onClick={closeSidebar}>
          <span className="brand-mark">D</span> Shop Admin
        </Link>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'active' : ''}
                onClick={closeSidebar}
              >
                {item.label}
              </Link>
            );
          })}
          <Link href="/" target="_blank" rel="noreferrer" onClick={closeSidebar}>
            Xem website ↗
          </Link>
        </nav>
        <div className="admin-user">
          <div>
            <div className="admin-user-label">Đang đăng nhập</div>
            <div className="admin-user-name">{username}</div>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              logout();
              router.replace('/admin/login');
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
