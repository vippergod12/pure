import Navbar from '@/components/Navbar';
import ConditionalFooter from '@/components/ConditionalFooter';
import FloatingActions from '@/components/FloatingActions';
import PageTransition from '@/components/PageTransition';

/**
 * Layout cho mọi trang public (home, cua-hang, danh-muc, san-pham).
 * Admin pages dùng layout riêng và không có navbar/footer/floating.
 *
 * `<PageTransition>` bọc main để fade-in mượt mỗi khi user chuyển tab.
 * `<ConditionalFooter>` ẩn Footer ở các trang scrollytelling (vd
 * /gioi-thieu kết thúc bằng CTA, không cần footer cũ ở dưới).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-main">
        <PageTransition>{children}</PageTransition>
      </main>
      <ConditionalFooter />
      <FloatingActions />
    </div>
  );
}
