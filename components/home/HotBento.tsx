import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import Reveal from '../Reveal';
import { PriceDisplay, SaleBadge } from '../SaleBadge';
import { DEFAULT_BLUR_DATA_URL } from '@/lib/utils/blur';

interface Props {
  products: Product[];
  loading?: boolean;
}

type Slot = 'hero' | 'tall' | 'small';

// Layout 4-col x 3-row magazine, 8 items total:
//   [ HERO  HERO  TALL  small ]
//   [ HERO  HERO  TALL  small ]
//   [ small small small small ]
const SLOTS: Slot[] = ['hero', 'tall', 'small', 'small', 'small', 'small', 'small', 'small'];

function Fallback({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '·';
  return (
    <div className="bento-fallback">
      <span className="bento-fallback-mark">{initial}</span>
      <span className="bento-fallback-text">{name}</span>
    </div>
  );
}

export default function HotBento({ products, loading }: Props) {
  const items = products.slice(0, 8);

  return (
    <section id="hot" className="section section-hot">
      <div className="container">
        <Reveal variant="fade-up">
          <div className="hot-heading">
            <div>
              <span className="section-eyebrow">✦ Bộ sưu tập 2026</span>
              <h2>Tuyệt phẩm đang được yêu thích</h2>
            </div>
          </div>
        </Reveal>

        {loading ? (
          <div className="empty-state">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Chưa có sản phẩm.</div>
        ) : (
          <div className="bento">
            {items.map((p, i) => {
              const slot = SLOTS[i] ?? 'small';
              const altText = p.category_name
                ? `${p.name} — ${p.category_name}`
                : p.name;
              return (
                <Reveal
                  key={p.id}
                  variant="fade-up"
                  delay={i * 80}
                  className={`bento-cell bento-${slot}`}
                >
                  <Link
                    href={`/san-pham/${p.slug}`}
                    className={`bento-card ${!p.is_active ? 'is-soldout' : ''}`}
                  >
                    <div className="bento-image">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={altText}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          priority={i === 0}
                          loading={i === 0 ? 'eager' : 'lazy'}
                          quality={80}
                          placeholder="blur"
                          blurDataURL={DEFAULT_BLUR_DATA_URL}
                          className="bento-image-img"
                        />
                      ) : (
                        <Fallback name={p.name} />
                      )}
                    </div>
                    <div className="bento-overlay" aria-hidden />
                    {p.is_active ? (
                      <SaleBadge product={p} />
                    ) : (
                      <div className="soldout-overlay">
                        <span>Hết hàng</span>
                      </div>
                    )}
                    <span className="bento-tag">#{i + 1} HOT</span>
                    <div className="bento-info">
                      <span className="bento-cat">{p.category_name ?? ''}</span>
                      <h3>{p.name}</h3>
                      <PriceDisplay product={p} className="bento-price" />
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
