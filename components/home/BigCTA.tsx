'use client';

import Reveal from '../Reveal';

export default function BigCTA() {
  return (
    <section className="section section-cta">
      <Reveal variant="fade-up">
        <div className="container cta-grid">
          <h2>
            <span>Một viên đá quý</span>
            <span className="cta-italic">cho khoảnh khắc</span>
            <span>vĩnh cửu.</span>
          </h2>
          <a
            href="#hot"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('hot')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="cta-link"
          >
            Khám phá ngay ↗
          </a>
        </div>
      </Reveal>
    </section>
  );
}
