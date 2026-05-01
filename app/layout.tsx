import type { Metadata, Viewport } from 'next';
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  DEFAULT_OG_IMAGE,
} from '@/lib/seo/siteConfig';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  generator: 'Next.js',
  keywords: [
    'trang sức đá quý',
    'ngọc lục bảo',
    'emerald',
    'ruby',
    'sapphire',
    'kim cương',
    'ngọc trai',
    'nhẫn đá quý',
    'vòng cổ đá quý',
    'mặt dây chuyền',
    'hoa tai đá quý',
    'vòng tay đá quý',
    'bạc 925',
    'trang sức cao cấp',
    'phụ kiện đá quý',
    SITE_NAME,
  ],
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: '/favicon.svg',
  },
  alternates: {
    canonical: '/',
    languages: { vi: SITE_URL, 'x-default': SITE_URL },
  },
};

export const viewport: Viewport = {
  themeColor: '#0a3a2c',
  width: 'device-width',
  initialScale: 1,
};

// Google Fonts CSS API tự đính kèm `unicode-range` cho từng subset
// (latin, latin-ext, vietnamese...). Browser CHỈ tải subset chứa ký tự
// thực sự render → Vietnamese được lo tự động.
const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  'family=DM+Sans:wght@400;500;600;700&' +
  'family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&' +
  'display=swap';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
