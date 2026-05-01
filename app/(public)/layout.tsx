import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingActions from '@/components/FloatingActions';

/**
 * Layout cho mọi trang public (home, cua-hang, danh-muc, san-pham).
 * Admin pages dùng layout riêng và không có navbar/footer/floating.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-main">{children}</main>
      <Footer />
      <FloatingActions />
    </div>
  );
}
