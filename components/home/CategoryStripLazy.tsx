'use client';

import dynamic from 'next/dynamic';
import type { Category } from '@/lib/types';

/**
 * Skeleton thay thế CategoryStrip lúc Swiper chưa load xong.
 *
 * Giữ chiều cao + cấu trúc gần với component thật để tránh layout shift.
 */
function CategoryStripSkeleton() {
  return (
    <section className="section section-strip">
      <div className="container">
        <div className="strip-heading">
          <div>
            <span className="section-eyebrow">Tuyển chọn</span>
            <h2>Khám phá theo danh mục</h2>
          </div>
          <p className="strip-hint">Đang tải danh mục…</p>
        </div>
        <div className="strip-skeleton">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="strip-skeleton-card" aria-hidden />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Dynamic import:
 *   - `ssr: false`: bỏ qua SSR cho component này → khỏi bundle Swiper vào HTML.
 *     Bù lại khách lần đầu vào sẽ thấy skeleton ~ vài trăm ms cho tới khi Swiper
 *     được tải xong. Đổi lại initial JS bundle nhỏ hơn ~50KB.
 *   - `loading`: skeleton hiển thị trong lúc tải chunk.
 */
const CategoryStripDynamic = dynamic(
  () => import('./CategoryStrip'),
  {
    ssr: false,
    loading: () => <CategoryStripSkeleton />,
  },
);

interface Props {
  categories: Category[];
}

export default function CategoryStripLazy({ categories }: Props) {
  return <CategoryStripDynamic categories={categories} />;
}
