/**
 * Helpers tạo JSON-LD schema.org cho Google rich results.
 *
 * Tham khảo: https://schema.org/Product, https://schema.org/BreadcrumbList,
 * https://schema.org/Organization, https://schema.org/ItemList
 */

import type { Category, Product } from '../types';
import { getSaleInfo } from '../utils/sale';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from './siteConfig';

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/favicon.svg'),
    description: SITE_DESCRIPTION,
    sameAs: [],
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'vi-VN',
    publisher: { '@id': `${SITE_URL}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/cua-hang?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export type Crumb = { name: string; url: string };

export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.name,
      item: absoluteUrl(c.url),
    })),
  };
}

export function productJsonLd(product: Product): Record<string, unknown> {
  const sale = getSaleInfo(product);
  const url = absoluteUrl(`/san-pham/${product.slug}`);
  const availability = product.is_active
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    name: product.name,
    description:
      product.description?.trim() ||
      `${product.name} — ${product.category_name ?? 'Sản phẩm'} tại ${SITE_NAME}.`,
    image: product.image_url ? [absoluteUrl(product.image_url)] : [],
    sku: `TS-${product.id}`,
    category: product.category_name ?? undefined,
    brand: { '@type': 'Brand', name: SITE_NAME },
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'VND',
      price: sale.effectivePrice,
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      ...(sale.isOnSale && sale.saleEndAt
        ? { priceValidUntil: sale.saleEndAt.toISOString() }
        : {}),
      seller: { '@id': `${SITE_URL}#organization` },
    },
  };
}

export function itemListJsonLd(
  products: Product[],
  pageUrl: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: absoluteUrl(pageUrl),
    numberOfItems: products.length,
    itemListElement: products.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: absoluteUrl(`/san-pham/${p.slug}`),
      name: p.name,
    })),
  };
}

export function collectionPageJsonLd(
  category: Category,
  products: Product[],
): Record<string, unknown> {
  const url = absoluteUrl(`/danh-muc/${category.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': url,
    url,
    name: category.name,
    description:
      category.description?.trim() ||
      `Bộ sưu tập ${category.name} tại ${SITE_NAME}.`,
    isPartOf: { '@id': `${SITE_URL}#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: absoluteUrl(`/san-pham/${p.slug}`),
        name: p.name,
      })),
    },
  };
}

/**
 * JSX-friendly: render JSON-LD trong RSC bằng <script type="application/ld+json">.
 *
 * Trả ra string đã JSON.stringify để có thể nhúng thẳng vào dangerouslySetInnerHTML.
 */
export function jsonLdScript(...blocks: Array<Record<string, unknown> | undefined>) {
  return blocks.filter(Boolean).map((b) => JSON.stringify(b));
}
