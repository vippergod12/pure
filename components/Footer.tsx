import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-col footer-brand-col">
          <Link href="/" className="footer-logo">
            <span className="brand-mark">P</span>
            <span className="footer-logo-text">PURE</span>
          </Link>
          <p className="footer-tag">
            Trang sức đá quý cao cấp — tôn vinh vẻ đẹp tinh khiết của thiên nhiên
            qua từng thiết kế thủ công.
          </p>
          <ul className="footer-contact">
            <li>
              <span className="footer-contact-label">Showroom:</span>
              88 Lê Lợi, Quận 1, TP. Hồ Chí Minh
            </li>
            <li>
              <span className="footer-contact-label">Hotline:</span>
              <a href="tel:0900000000">0900 000 000</a>
            </li>
            <li>
              <span className="footer-contact-label">Email:</span>
              <a href="mailto:hello@pure.vn">hello@pure.vn</a>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Về PURE</h4>
          <ul>
            <li>
              <Link href="/gioi-thieu">Câu chuyện thương hiệu</Link>
            </li>
            <li>
              <Link href="/">Hướng dẫn chọn size nhẫn</Link>
            </li>
            <li>
              <Link href="/">Cách bảo quản trang sức đá quý</Link>
            </li>
            <li>
              <Link href="/">Giấy kiểm định đá quý</Link>
            </li>
            <li>
              <Link href="/">Câu hỏi thường gặp</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Chính sách</h4>
          <ul>
            <li>
              <Link href="/">Bảo hành trọn đời</Link>
            </li>
            <li>
              <Link href="/">Chính sách đổi trả</Link>
            </li>
            <li>
              <Link href="/">Chính sách vận chuyển</Link>
            </li>
            <li>
              <Link href="/">Chính sách bảo mật</Link>
            </li>
            <li>
              <Link href="/">Khách hàng VIP</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>© {year} PURE Jewelry. Mọi quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
