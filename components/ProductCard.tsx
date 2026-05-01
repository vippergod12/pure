import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { PriceDisplay, SaleBadge } from './SaleBadge';

export default function ProductCard({ product }: { product: Product }) {
  const soldOut = !product.is_active;
  const altText = product.category_name
    ? `${product.name} — ${product.category_name}`
    : product.name;
  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className={`product-card ${soldOut ? 'is-soldout' : ''}`}
      draggable={false}
    >
      <div className="product-card-thumb">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={altText}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="product-card-img"
            draggable={false}
          />
        ) : (
          <div className="product-card-placeholder">No image</div>
        )}
        {!soldOut && <SaleBadge product={product} />}
        {soldOut && (
          <div className="soldout-overlay">
            <span>Hết hàng</span>
          </div>
        )}
      </div>
      <div className="product-card-body">
        <span className="product-card-category">{product.category_name ?? ''}</span>
        <h3 className="product-card-name">{product.name}</h3>
        <PriceDisplay product={product} className="product-card-price" showEndDate />
      </div>
    </Link>
  );
}
