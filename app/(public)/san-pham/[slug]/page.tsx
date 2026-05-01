import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { fetchProductDetail } from '@/lib/data';
import { formatVnd } from '@/lib/utils/format';
import { getSaleInfo } from '@/lib/utils/sale';
import { SaleBadge } from '@/components/SaleBadge';
import ProductCarousel from '@/components/ProductCarousel';
import ProductDetailCta from './ProductDetailCta';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/jsonLd';
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from '@/lib/seo/siteConfig';

export const revalidate = 60;

function formatSaleEnd(date: Date): string {
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Params = { slug: string };
type Props = { params: Params };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bundle = await fetchProductDetail(params.slug).catch(() => null);
  if (!bundle?.product) {
    return {
      title: 'Không tìm thấy sản phẩm',
      robots: { index: false, follow: false },
    };
  }

  const product = bundle.product;
  const sale = getSaleInfo(product);
  const priceLabel = formatVnd(sale.effectivePrice);
  const title = sale.isOnSale
    ? `${product.name} — Giảm còn ${priceLabel}`
    : `${product.name} — ${priceLabel}`;
  const description =
    product.description?.trim()?.slice(0, 200) ||
    `${product.name} — giá ${priceLabel}. Mua ngay tại ${SITE_NAME}, danh mục ${product.category_name ?? ''}.`;
  const canonical = `/san-pham/${product.slug}`;
  const image = product.image_url ? absoluteUrl(product.image_url) : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const bundle = await fetchProductDetail(params.slug).catch(() => null);
  if (!bundle?.product) notFound();

  const product = bundle.product;
  const sale = getSaleInfo(product);
  const related = (bundle.related ?? []).slice(0, 12);
  const hot = (bundle.featured ?? []).slice(0, 12);

  const jsonLd: unknown[] = [
    productJsonLd(product),
    breadcrumbJsonLd([
      { name: 'Trang chủ', url: '/' },
      {
        name: product.category_name ?? 'Danh mục',
        url: `/danh-muc/${product.category_slug ?? ''}`,
      },
      { name: product.name, url: `/san-pham/${product.slug}` },
    ]),
  ];

  return (
    <>
      {jsonLd.map((data, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <section className="section">
        <div className="container">
          <nav className="breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <Link href={`/danh-muc/${product.category_slug ?? ''}`}>
              {product.category_name}
            </Link>
            <span>/</span>
            <span>{product.name}</span>
          </nav>

          <div className={`product-detail ${!product.is_active ? 'is-soldout' : ''}`}>
            <div className="product-detail-media">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={`${product.name}${product.category_name ? ` — ${product.category_name}` : ''} | ${SITE_NAME}`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="product-detail-media-img"
                />
              ) : (
                <div className="product-card-placeholder">No image</div>
              )}
              <SaleBadge product={product} />
              {!product.is_active && (
                <div className="soldout-overlay">
                  <span>Hết hàng</span>
                </div>
              )}
            </div>
            <div className="product-detail-info">
              <h1>{product.name}</h1>
              {sale.isOnSale ? (
                <div className="product-detail-price-group">
                  <div className="product-detail-price">{formatVnd(sale.effectivePrice)}</div>
                  <div className="product-detail-price-original">
                    <span className="strike">{formatVnd(sale.originalPrice)}</span>
                    <span className="discount-tag">-{sale.discountPercent}%</span>
                  </div>
                  {sale.saleEndAt && (
                    <p className="sale-countdown">
                      Sale kết thúc lúc <strong>{formatSaleEnd(sale.saleEndAt)}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="product-detail-price">{formatVnd(product.price)}</div>
              )}
              <p className="product-detail-description">
                {product.description || 'Chưa có mô tả cho sản phẩm này.'}
              </p>

              <ProductDetailCta product={product} />

              <div className="product-detail-meta">
                <div>
                  <span className="meta-label">Danh mục</span>
                  <span>{product.category_name}</span>
                </div>
                <div>
                  <span className="meta-label">Tình trạng</span>
                  <span className={product.is_active ? 'status-on' : 'status-off'}>
                    {product.is_active ? 'Còn hàng' : 'Hết hàng'}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Mã sản phẩm</span>
                  <span>#{product.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <ProductCarousel
          eyebrow="Cùng danh mục"
          title={`Sản phẩm khác trong "${product.category_name}"`}
          products={related}
        />
      )}

      {hot.length > 0 && (
        <ProductCarousel
          eyebrow="★ Hot"
          title="Đang được săn đón"
          products={hot}
        />
      )}
    </>
  );
}
