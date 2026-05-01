import { fetchHome } from '@/lib/data';
import HeroEditorial from '@/components/home/HeroEditorial';
import Marquee from '@/components/home/Marquee';
import HotBento from '@/components/home/HotBento';
import TrendingGrid from '@/components/home/TrendingGrid';
import StorySection from '@/components/home/StorySection';
import BigCTA from '@/components/home/BigCTA';
import CategoryStripLazy from '@/components/home/CategoryStripLazy';
import LazyMount from '@/components/LazyMount';
import {
  itemListJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo/jsonLd';

export const revalidate = 60;

export default async function HomePage() {
  const bundle = await fetchHome().catch(() => ({
    categories: [],
    products: [],
    featured: [],
    hero: null,
  }));

  const { categories, products, featured, hero } = bundle;
  const hotProducts = featured.length > 0 ? featured : products.slice(0, 8);

  const jsonLd: unknown[] = [organizationJsonLd(), websiteJsonLd()];
  if (hotProducts.length > 0) {
    jsonLd.push(itemListJsonLd(hotProducts.slice(0, 12), '/'));
  }

  return (
    <div className="home">
      {jsonLd.map((data, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}

      {/* ABOVE-THE-FOLD: render thẳng, có priority cho LCP image */}
      <HeroEditorial categories={categories} products={products} hero={hero} />
      <Marquee />

      {/* BELOW-THE-FOLD - SEO-critical (sản phẩm hot): SSR thẳng giữ Google index */}
      <HotBento products={hotProducts} />

      {/* CategoryStrip dùng Swiper (~50KB) → dynamic import, ssr:false. */}
      <CategoryStripLazy categories={categories} />

      {/* TrendingGrid quan trọng cho SEO sản phẩm mới → giữ SSR, ảnh đã lazy. */}
      <TrendingGrid products={products.slice(0, 8)} />

      {/* Section trang trí dưới cùng → mount on scroll, save initial DOM/CSS work */}
      <LazyMount minHeight={420} rootMargin="500px">
        <StorySection />
      </LazyMount>
      <LazyMount minHeight={260} rootMargin="500px">
        <BigCTA />
      </LazyMount>
    </div>
  );
}
