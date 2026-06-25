'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Lightweight route transition for public pages.
 *
 * Navigation must stay owned by Next.js Link. The previous version captured
 * document clicks and called preventDefault() before pushing with the router;
 * in some Chromium runtimes that left internal links inert.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [stage, setStage] = useState<'enter' | 'idle'>('idle');
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setStage('enter');
    if (typeof window !== 'undefined' && !window.location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setStage('idle'));
    });

    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`page-transition ${stage === 'enter' ? 'is-entering' : ''}`}
    >
      {children}
    </div>
  );
}
