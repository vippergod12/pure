import type { Metadata } from 'next';
import AboutHero from '@/components/about/AboutHero';
import { SITE_NAME } from '@/lib/seo/siteConfig';

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Giới thiệu — Câu chuyện ${SITE_NAME}`,
  description:
    'PURE — trang sức đá quý cao cấp. Khởi nguồn, sứ mệnh, bốn trụ cột giá trị và lời cam kết minh bạch về nguồn gốc đá quý đến tay người Việt.',
  alternates: { canonical: '/gioi-thieu' },
  openGraph: {
    title: `Giới thiệu — Câu chuyện ${SITE_NAME}`,
    description:
      'Câu chuyện về PURE Jewelry — sứ mệnh, giá trị và sự khác biệt.',
    url: '/gioi-thieu',
    type: 'article',
  },
};

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* Toàn bộ câu chuyện diễn ra trong sticky stage:
          eye-opening background + 5 chương crossfade theo scroll.
          Sau beat "Tư vấn" → kết thúc, đi thẳng vào Footer. */}
      <AboutHero />
    </div>
  );
}
