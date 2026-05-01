import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchCategory, fetchProducts } from '@/lib/data';
import ProductCard from '@/components/ProductCard';
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
} from '@/lib/seo/jsonLd';
import { SITE_NAME } from '@/lib/seo/siteConfig';

export const revalidate = 60;

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await fetchCategory(params.slug).catch(() => null);
  if (!category) {
    return {
      title: 'Không tìm thấy danh mục',
      robots: { index: false, follow: false },
    };
  }

  const description =
    category.description?.trim() ||
    `Khám phá bộ sưu tập ${category.name} tại ${SITE_NAME}.`;

  return {
    title: `${category.name} — Bộ sưu tập`,
    description,
    alternates: { canonical: `/danh-muc/${category.slug}` },
    openGraph: {
      title: `${category.name} — Bộ sưu tập | ${SITE_NAME}`,
      description,
      images: category.image_url ? [{ url: category.image_url }] : undefined,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const [category, products] = await Promise.all([
    fetchCategory(params.slug).catch(() => null),
    fetchProducts({ category: params.slug }).catch(() => []),
  ]);

  if (!category) notFound();

  const jsonLd: unknown[] = [
    collectionPageJsonLd(category, products),
    breadcrumbJsonLd([
      { name: 'Trang chủ', url: '/' },
      { name: category.name, url: `/danh-muc/${category.slug}` },
    ]),
  ];

  return (
    <div className="section">
      {jsonLd.map((data, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <div className="container">
        <nav className="breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <span>{category.name}</span>
        </nav>
        <div className="category-header">
          <div>
            <h1>{category.name}</h1>
            {category.description && <p>{category.description}</p>}
          </div>
          <span className="badge">{products.length} sản phẩm</span>
        </div>
        {products.length === 0 ? (
          <div className="empty-state">Chưa có sản phẩm trong danh mục này.</div>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
