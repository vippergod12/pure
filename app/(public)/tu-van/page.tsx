import type { Metadata } from 'next';
import ConsultationForm from '@/components/consultation/ConsultationForm';
import { SITE_NAME } from '@/lib/seo/siteConfig';

export const metadata: Metadata = {
  title: `Đặt lịch tư vấn — ${SITE_NAME}`,
  description:
    'Để lại số điện thoại — chuyên gia đá quý PURE sẽ liên hệ tư vấn miễn phí trong vòng 30 phút (giờ hành chính).',
  alternates: { canonical: '/tu-van' },
  openGraph: {
    title: `Đặt lịch tư vấn — ${SITE_NAME}`,
    description: 'Tư vấn 1:1 miễn phí cùng chuyên gia đá quý PURE.',
    url: '/tu-van',
    type: 'website',
  },
};

export default function ConsultationPage() {
  return (
    <div className="consult-page">
      <section className="consult-section">
        <div className="container consult-grid">
          {/* Cột trái: thông điệp + lý do nên đăng ký */}
          <div className="consult-intro">
            <span className="consult-eyebrow">— Tư vấn 1:1 —</span>
            <h1 className="consult-title">
              Để chúng tôi <em>giúp bạn</em> chọn viên đá phù hợp
            </h1>
            <p className="consult-lead">
              Mỗi viên đá có một vẻ đẹp riêng — và mỗi người có một câu chuyện
              riêng. Để lại số điện thoại, chuyên gia đá quý của PURE sẽ gọi
              bạn trong vòng <strong>30 phút</strong> (giờ hành chính) để lắng
              nghe và gợi ý lựa chọn ưng ý nhất.
            </p>

            <ul className="consult-perks">
              <li>
                <span className="consult-perk-mark" aria-hidden>
                  {'◆\uFE0E'}
                </span>
                <div>
                  <strong>Miễn phí, không ràng buộc</strong>
                  <span>Bạn không cần phải mua gì sau buổi tư vấn.</span>
                </div>
              </li>
              <li>
                <span className="consult-perk-mark" aria-hidden>
                  {'◆\uFE0E'}
                </span>
                <div>
                  <strong>Chuyên gia có chứng chỉ GIA</strong>
                  <span>Hiểu rõ từng loại đá — cung mệnh, ý nghĩa, giá thị trường.</span>
                </div>
              </li>
              <li>
                <span className="consult-perk-mark" aria-hidden>
                  {'◆\uFE0E'}
                </span>
                <div>
                  <strong>Bảo mật tuyệt đối</strong>
                  <span>Số điện thoại của bạn chỉ được dùng để liên hệ tư vấn.</span>
                </div>
              </li>
            </ul>

            <div className="consult-hotline">
              <span>Hoặc gọi trực tiếp:</span>
              <a href="tel:0900000000">0900 000 000</a>
            </div>
          </div>

          {/* Cột phải: form */}
          <div className="consult-form-wrap">
            <ConsultationForm />
          </div>
        </div>
      </section>
    </div>
  );
}
