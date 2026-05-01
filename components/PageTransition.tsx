'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Page transition cho Next.js App Router.
 *
 * Chiến lược 2 lớp:
 *
 *   1. View Transitions API (Chrome 111+, Edge, Safari 18+)
 *      - Intercept click trên các <a> internal
 *      - Wrap router.push trong document.startViewTransition()
 *      - Browser tự chụp ảnh trang cũ → crossfade sang trang mới
 *      - Mượt tuyệt đối, không có flash, không "trang trắng"
 *
 *   2. Fallback CSS (Firefox, Safari < 18)
 *      - Khi pathname đổi → wrapper unmount/mount với key
 *      - Class .is-entering tạo opacity 0 → 1 + slide-up nhẹ
 *      - Vẫn có cảm giác chuyển trang, không bị pop cứng
 */

declare global {
  interface Document {
    startViewTransition?: (callback: () => void) => {
      finished: Promise<void>;
      ready: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  }
}

const SUPPORTS_VT =
  typeof document !== 'undefined' && typeof document.startViewTransition === 'function';

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [stage, setStage] = useState<'enter' | 'idle'>('idle');
  const firstRender = useRef(true);

  // === Lớp 1: View Transitions API — intercept click links ===
  useEffect(() => {
    if (!SUPPORTS_VT) return;

    function isInternalNav(link: HTMLAnchorElement, e: MouseEvent): string | null {
      // Bỏ qua nếu user nhấn modifier (mở tab mới), middle-click, target=_blank
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return null;
      if (link.target === '_blank') return null;
      const href = link.getAttribute('href');
      if (!href) return null;
      if (href.startsWith('#')) return null;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        try {
          const url = new URL(href);
          if (url.origin !== window.location.origin) return null;
          return url.pathname + url.search + url.hash;
        } catch {
          return null;
        }
      }
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return null;
      return href;
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const link = target?.closest('a') as HTMLAnchorElement | null;
      if (!link) return;
      const dest = isInternalNav(link, e);
      if (!dest) return;
      // Cùng URL → không cần transition
      if (dest === pathname || dest === window.location.pathname + window.location.search) return;

      e.preventDefault();
      document.startViewTransition!(() => {
        router.push(dest);
      });
    }

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [pathname, router]);

  // === Lớp 2: Fallback CSS cho browser không hỗ trợ VT ===
  useEffect(() => {
    if (SUPPORTS_VT) return; // đã có VT lo
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setStage('enter');
    if (typeof window !== 'undefined' && !window.location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setStage('idle'));
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // VT-supported browser: không cần wrapper với key (browser tự handle)
  if (SUPPORTS_VT) {
    return <div className="page-transition-host">{children}</div>;
  }

  // Fallback: re-mount với key + class transition
  return (
    <div
      key={pathname}
      className={`page-transition ${stage === 'enter' ? 'is-entering' : ''}`}
    >
      {children}
    </div>
  );
}
