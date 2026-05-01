'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Category, Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import { getSaleInfo } from '@/lib/utils/sale';

type SortKey = 'newest' | 'price-asc' | 'price-desc';

const PAGE_SIZE = 12;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá: Thấp → Cao' },
  { value: 'price-desc', label: 'Giá: Cao → Thấp' },
];

const ALL = 'all';

function effectivePrice(p: Product): number {
  return getSaleInfo(p).effectivePrice;
}

function sortProducts(list: Product[], key: SortKey): Product[] {
  const arr = [...list];
  if (key === 'price-asc') {
    arr.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  } else if (key === 'price-desc') {
    arr.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  } else {
    arr.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  }
  return arr;
}

interface Props {
  categories: Category[];
  products: Product[];
  activeCategory: string;
}

/**
 * Phần tương tác của trang /cua-hang:
 *  - Sidebar lọc theo danh mục (push vào URL ?cat=)
 *  - Sort dropdown (push ?sort=)
 *  - Pagination "Xem thêm"
 *
 * Trang server-rendered đã pre-fetch sản phẩm theo `?cat=` để SEO. Phần sắp
 * xếp / pagination chỉ là tương tác phía client.
 */
export default function AllProductsView({
  categories,
  products,
  activeCategory,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortRaw = (searchParams.get('sort') || 'newest') as SortKey;
  const sort: SortKey = SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw : 'newest';

  const [visible, setVisible] = useState(PAGE_SIZE);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all' || (key === 'sort' && value === 'newest')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const qs = next.toString();
    router.replace(qs ? `/cua-hang?${qs}` : '/cua-hang', { scroll: false });
  }

  function chooseCategory(slug: string) {
    setVisible(PAGE_SIZE);
    setParam('cat', slug);
  }

  function chooseSort(s: SortKey) {
    setVisible(PAGE_SIZE);
    setParam('sort', s);
  }

  const sorted = useMemo(() => sortProducts(products, sort), [products, sort]);
  const shown = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  function loadMore() {
    setVisible((v) => Math.min(v + PAGE_SIZE, sorted.length));
  }

  return (
    <div className="all-products-layout">
      <aside className="all-products-sidebar" aria-label="Danh mục">
        <h3 className="sidebar-title">Danh mục</h3>
        <ul className="sidebar-list">
          <li>
            <button
              type="button"
              className={`sidebar-item ${activeCategory === ALL ? 'is-active' : ''}`}
              onClick={() => chooseCategory(ALL)}
            >
              <span>Tất cả</span>
              <span className="sidebar-count" aria-hidden>
                {categories.reduce((sum, c) => sum + (c.product_count ?? 0), 0)}
              </span>
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`sidebar-item ${activeCategory === c.slug ? 'is-active' : ''}`}
                onClick={() => chooseCategory(c.slug)}
              >
                <span>{c.name}</span>
                {typeof c.product_count === 'number' && (
                  <span className="sidebar-count" aria-hidden>
                    {c.product_count}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="all-products-main">
        <div className="all-products-toolbar">
          <span className="toolbar-info">
            Hiển thị <strong>{shown.length}</strong> / {sorted.length}
          </span>
          <div className="toolbar-sort">
            <label htmlFor="sort-select">Sắp xếp</label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => chooseSort(e.target.value as SortKey)}
              className="select"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="empty-state">Chưa có sản phẩm nào trong mục này.</div>
        ) : (
          <>
            <div className="product-grid all-products-grid">
              {shown.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="load-more-wrap">
                <button type="button" className="btn-load-more" onClick={loadMore}>
                  Xem thêm
                  <span className="load-more-meta">
                    ({sorted.length - visible} sản phẩm)
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
