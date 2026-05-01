import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchCategories, fetchProducts } from '@/lib/data';
import {
  breadcrumbJsonLd,
  itemListJsonLd,
} from '@/lib/seo/jsonLd';
import { SITE_NAME } from '@/lib/seo/siteConfig';
import AllProductsView from './AllProductsView';

export const revalidate = 60;

type Props = {
  searchParams: { cat?: string; sort?: string };
};

const ALL = 'all';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const cat = (searchParams.cat || ALL).trim() || ALL;
  if (cat === ALL) {
    return {
      title: 'Cửa hàng — Toàn bộ trang sức đá quý',
      description: `Khám phá toàn bộ bộ sưu tập trang sức đá quý cao cấp tại ${SITE_NAME}: nhẫn, vòng cổ, hoa tai, vòng tay, mặt dây chuyền — đá tự nhiên có giấy kiểm định.`,
      alternates: { canonical: '/cua-hang' },
    };
  }
  const categories = await fetchCategories().catch(() => []);
  const found = categories.find((c) => c.slug === cat);
  if (!found) {
    return {
      title: 'Cửa hàng',
      alternates: { canonical: '/cua-hang' },
    };
  }
  return {
    title: `${found.name} — Cửa hàng`,
    description:
      found.description?.trim() ||
      `Bộ sưu tập ${found.name} tại ${SITE_NAME}.`,
    alternates: { canonical: `/cua-hang?cat=${cat}` },
  };
}

export default async function AllProductsPage({ searchParams }: Props) {
  const cat = (searchParams.cat || ALL).trim() || ALL;
  const [categories, products] = await Promise.all([
    fetchCategories().catch(() => []),
    fetchProducts(cat === ALL ? {} : { category: cat }).catch(() => []),
  ]);

  const currentCategory = categories.find((c) => c.slug === cat);
  const pageName = cat === ALL ? 'Toàn bộ sản phẩm' : currentCategory?.name ?? 'Toàn bộ sản phẩm';
  const canonicalPath = cat === ALL ? '/cua-hang' : `/cua-hang?cat=${cat}`;

  const jsonLd: unknown[] = [
    breadcrumbJsonLd([
      { name: 'Trang chủ', url: '/' },
      { name: pageName, url: canonicalPath },
    ]),
  ];
  if (products.length > 0) {
    jsonLd.push(itemListJsonLd(products.slice(0, 30), canonicalPath));
  }

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
          <span>{pageName}</span>
        </nav>

        <div className="all-products-header">
          <div>
            <span className="section-eyebrow">Cửa hàng</span>
            <h1>{pageName}</h1>
          </div>
          <span className="all-products-count">{products.length} sản phẩm</span>
        </div>

        <AllProductsView
          categories={categories}
          products={products}
          activeCategory={cat}
        />
      </div>
    </div>
  );
}
