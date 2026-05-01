'use client';

import {
  ReactNode,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

interface Props {
  children: ReactNode;
  /** UI hiển thị trước khi children được mount (skeleton). */
  fallback?: ReactNode;
  /** Khoảng cách "preload" trước khi cuộn đến (px hoặc %). Default 400px. */
  rootMargin?: string;
  /** Reserve chiều cao tối thiểu để tránh layout shift (CLS). */
  minHeight?: number | string;
  className?: string;
  /**
   * Nếu `true`: render `children` ngay từ SSR (tốt cho SEO content).
   * Khi đó hook chỉ dùng để defer animation / heavy effect, không skip render.
   * Mặc định `false` — render `fallback` cho tới khi viewport gần tới.
   */
  ssr?: boolean;
}

/**
 * Mount-on-scroll wrapper. Trì hoãn render `children` cho tới khi vùng chứa
 * gần (rootMargin) hoặc lọt vào viewport. Một khi đã mount, không gỡ ra nữa.
 *
 * Dùng cho các section trang trí dưới màn hình để giảm DOM/CSS/JS work
 * lúc page mới load → first paint nhanh hơn.
 *
 * Lưu ý:
 * - Đây là client component, render fallback ở SSR (trừ khi `ssr=true`).
 * - Tránh dùng cho content SEO quan trọng (sản phẩm, headings) → set `ssr=true`
 *   khi cần.
 */
export default function LazyMount({
  children,
  fallback = null,
  rootMargin = '400px',
  minHeight,
  className,
  ssr = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<boolean>(ssr);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  const style: CSSProperties | undefined =
    !visible && minHeight !== undefined ? { minHeight } : undefined;

  return (
    <div ref={ref} className={className} style={style}>
      {visible ? children : fallback}
    </div>
  );
}
