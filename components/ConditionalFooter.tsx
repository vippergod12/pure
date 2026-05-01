'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

/**
 * Render Footer trừ các route nằm trong HIDE_ON.
 *
 * Trang `/gioi-thieu` là trải nghiệm "scrollytelling" liền mạch —
 * kết thúc ở beat "Tư vấn" với CTA, không cần footer cũ ở dưới.
 */
const HIDE_ON: ReadonlyArray<string> = ['/gioi-thieu'];

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname && HIDE_ON.includes(pathname)) return null;
  return <Footer />;
}
