import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchProductDetail } from '@/lib/data';
import { SITE_NAME } from '@/lib/seo/siteConfig';
import CheckoutForm from './CheckoutForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string };
  searchParams?: { color?: string | string[] };
};

type AppotaPayEnvironment = 'sandbox' | 'production';

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getAppotaPayEnvironment(): AppotaPayEnvironment {
  const env = (process.env.APPOTAPAY_ENV ?? 'sandbox').trim().toLowerCase();
  const gatewayUrl = (process.env.APPOTAPAY_GATEWAY_URL ?? '').trim().toLowerCase();
  if (env === 'production' || gatewayUrl === 'https://gateway.appotapay.com') {
    return 'production';
  }
  return 'sandbox';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bundle = await fetchProductDetail(params.slug).catch(() => null);
  const product = bundle?.product;
  if (!product) {
    return {
      title: 'Không tìm thấy sản phẩm',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Thanh toán ${product.name} | ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const bundle = await fetchProductDetail(params.slug).catch(() => null);
  if (!bundle?.product) notFound();

  const product = bundle.product;
  const initialColor = firstParam(searchParams?.color);
  const appotaPayEnvironment = getAppotaPayEnvironment();

  return (
    <section className="section checkout-page">
      <div className="container">
        <nav className="breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href={`/san-pham/${product.slug}`}>{product.name}</Link>
          <span>/</span>
          <span>Thanh toán</span>
        </nav>

        {product.is_active ? (
          <CheckoutForm
            product={product}
            initialColor={initialColor}
            appotaPayEnvironment={appotaPayEnvironment}
          />
        ) : (
          <div className="payment-result-panel">
            <span className="checkout-eyebrow">Tạm hết hàng</span>
            <h1>Sản phẩm chưa thể thanh toán</h1>
            <p>{product.name} hiện đang tạm hết hàng.</p>
            <div className="payment-result-actions">
              <Link className="btn btn-primary" href="/cua-hang">
                Xem sản phẩm khác
              </Link>
              <Link className="btn btn-ghost" href={`/san-pham/${product.slug}`}>
                Quay lại sản phẩm
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
