'use client';

import { useId, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass } from 'swiper/types';
import { Navigation, Pagination, A11y, Keyboard } from 'swiper/modules';
import type { Product } from '@/lib/types';
import ProductCard from './ProductCard';
import Reveal from './Reveal';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface Props {
  title: string;
  eyebrow?: string;
  products: Product[];
  /** Ẩn cả section khi không có sản phẩm (mặc định true) */
  hideWhenEmpty?: boolean;
}

export default function ProductCarousel({
  title,
  eyebrow,
  products,
  hideWhenEmpty = true,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const prevClass = `pc-prev-${uid}`;
  const nextClass = `pc-next-${uid}`;
  const paginationClass = `pc-pagination-${uid}`;
  const swiperRef = useRef<SwiperClass | null>(null);

  if (hideWhenEmpty && products.length === 0) return null;

  return (
    <section className="section product-carousel-section">
      <div className="container">
        <Reveal variant="fade-up">
          <div className="product-carousel-head">
            <div>
              {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
              <h2>{title}</h2>
            </div>
            <span className="product-carousel-hint">{products.length} sản phẩm</span>
          </div>
        </Reveal>

        <div className="product-carousel">
          <Swiper
            modules={[Navigation, Pagination, A11y, Keyboard]}
            onSwiper={(s) => {
              swiperRef.current = s;
            }}
            spaceBetween={20}
            slidesPerView={1.2}
            slidesPerGroup={1}
            speed={500}
            grabCursor
            keyboard={{ enabled: true }}
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
            {products.map((p) => (
              <SwiperSlide key={p.id} className="pc-slide">
                <ProductCard product={p} />
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            type="button"
            className={`pc-nav pc-nav-prev ${prevClass}`}
            aria-label="Trang trước"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            className={`pc-nav pc-nav-next ${nextClass}`}
            aria-label="Trang sau"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <div className={`pc-pagination ${paginationClass}`} />
        </div>
      </div>
    </section>
  );
}
