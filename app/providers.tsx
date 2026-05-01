'use client';

import { AuthProvider } from '@/lib/contexts/AuthContext';

/**
 * Client-only providers wrapper.
 * Đặt trong root layout để bao toàn bộ app.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
