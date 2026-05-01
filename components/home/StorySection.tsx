export default function StorySection() {
  return (
    <section className="section section-dark">
      <div className="container story-grid">
        <div
          className="story-image"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1200&auto=format&fit=crop)",
          }}
          aria-hidden
        />
        <div className="story-content">
          <span className="section-eyebrow">Câu chuyện PURE</span>
          <h2>Mỗi viên đá — một di sản thiên nhiên</h2>
          <p>
            PURE tuyển chọn những viên đá quý tự nhiên có nguồn gốc rõ ràng,
            đi kèm giấy kiểm định quốc tế. Từ ngọc lục bảo Colombia, ruby Myanmar
            đến sapphire Kashmir — mỗi viên đá đều được nghệ nhân chế tác thủ công
            trên khung bạc 925 hoặc vàng 18K.
          </p>
          <ul className="story-list">
            <li>
              <strong>Đá tự nhiên 100%</strong>
              <span>Mỗi viên đá đi kèm giấy kiểm định GIA / GRS / SSEF.</span>
            </li>
            <li>
              <strong>Thủ công tinh xảo</strong>
              <span>Nghệ nhân chế tác trên khung bạc 925 và vàng 18K nguyên chất.</span>
            </li>
            <li>
              <strong>Bảo hành trọn đời</strong>
              <span>Đánh bóng, làm mới, kiểm tra ổ chấu miễn phí mãi mãi.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
