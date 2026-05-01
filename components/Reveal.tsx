'use client';

import { CSSProperties, ReactNode } from 'react';
import { useInView } from '@/lib/hooks/useInView';

type Variant = 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'scale-in';

interface Props {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  threshold?: number;
}

export default function Reveal({
  children,
  variant = 'fade-up',
  delay = 0,
  className = '',
  threshold = 0.15,
}: Props) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold });
  const style: CSSProperties = { transitionDelay: `${delay}ms` };

  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${inView ? 'is-visible' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
