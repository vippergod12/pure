import type { Metadata } from 'next';
import SandboxTopupForm from './SandboxTopupForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sandbox nạp tiền AppotaPay',
  robots: { index: false, follow: false },
};

export default function SandboxTopupPage() {
  return (
    <section className="section sandbox-topup-page">
      <div className="container">
        <SandboxTopupForm />
      </div>
    </section>
  );
}
