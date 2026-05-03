'use client';

import { useId, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass } from 'swiper/types';
import { Navigation, Pagination, A11y, Keyboard, FreeMode } from 'swiper/modules';
import type { Category } from '@/lib/types';
import { useDragGuard } from '@/lib/hooks/useDragGuard';
import Reveal from '../Reveal';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/free-mode';

interface Props {
  categories: Category[];
  loading?: boolean;
}

export default function CategoryStrip({ categories, loading }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const prevClass = `cs-prev-${uid}`;
  const nextClass = `cs-next-${uid}`;
  const paginationClass = `cs-pagination-${uid}`;
  const swiperRef = useRef<SwiperClass | null>(null);
  const dragGuard = useDragGuard();

  if (loading) return null;
  if (categories.length === 0) return null;

  return (
    <section className="section section-strip">
      <div className="container">
        <Reveal variant="fade-up">
          <div className="strip-heading">
            <div>
              <span className="section-eyebrow">Tuyển chọn</span>
              <h2>Khám phá theo danh mục</h2>
            </div>
            <p className="strip-hint">Kéo ngang để xem thêm →</p>
          </div>
        </Reveal>

        <div className="strip-carousel" {...dragGuard.bind()}>
          <Swiper
            modules={[Navigation, Pagination, A11y, Keyboard, FreeMode]}
            onSwiper={(s) => {
              swiperRef.current = s;
            }}
            spaceBetween={20}
            slidesPerView={1.2}
            slidesPerGroup={1}
            speed={550}
            grabCursor
            keyboard={{ enabled: true }}
            preventClicks
            preventClicksPropagation
            threshold={6}
            touchStartPreventDefault={false}
            freeMode={{
              enabled: true,
              momentum: true,
              momentumRatio: 0.6,
              momentumVelocityRatio: 0.6,
              sticky: true,
            }}
            navigation={{
              prevEl: `.${prevClass}`,
              nextEl: `.${nextClass}`,
            }}
            pagination={{
              el: `.${paginationClass}`,
              clickable: true,
              dynamicBullets: true,
              dynamicMainBullets: 4,
            }}
            breakpoints={{
              480: { slidesPerView: 1.6, spaceBetween: 16 },
              640: { slidesPerView: 2.2, spaceBetween: 18 },
              768: { slidesPerView: 3, slidesPerGroup: 3, spaceBetween: 20 },
              1024: { slidesPerView: 4, slidesPerGroup: 4, spaceBetween: 22 },
            }}
          >
            {categories.map((c, i) => (
              <SwiperSlide key={c.id} className="strip-slide">
                <Link
                  href={`/danh-muc/${c.slug}`}
                  className="strip-card"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                >
                  <div className="strip-image">
                    {c.image_url ? (
                      <Image
                        src={c.image_url}
                        alt={`Danh mục ${c.name}`}
                        fill
                        sizes="(max-width: 640px) 80vw, (max-width: 1024px) 33vw, 25vw"
                        className="strip-image-img"
                        draggable={false}
                      />
                    ) : (
                      <div className="strip-fallback">
                        <span>{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="strip-overlay" aria-hidden />
                    <span className="strip-num">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="strip-meta">
                    <h3>{c.name}</h3>
                    <span>{c.product_count ?? 0} sản phẩm →</span>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            type="button"
            className={`strip-nav strip-nav-prev ${prevClass}`}
            aria-label="Trang trước"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            className={`strip-nav strip-nav-next ${nextClass}`}
            aria-label="Trang sau"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <div className={`strip-pagination ${paginationClass}`} />
        </div>
      </div>
    </section>
  );
}
