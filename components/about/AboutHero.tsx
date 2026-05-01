'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Sticky scrollytelling stage — toàn bộ trải nghiệm About nằm trong 1
 * "sân khấu" cao 600vh, sticky 100vh ở giữa.
 *
 * Khi scroll, `progress` (0 → 1) chạy qua cả range, đồng thời:
 *   - Eye-opening background diễn ra ở 0 → 0.5 (mở xong khi đi nửa quãng)
 *   - 5 "beat" foreground crossfade vào theo tiến độ:
 *       beat 1 (0    → 0.20)  Hero title "Hé mở vẻ đẹp"
 *       beat 2 (0.18 → 0.40)  Khởi nguồn câu chuyện PURE
 *       beat 3 (0.38 → 0.62)  4 trụ cột giá trị
 *       beat 4 (0.60 → 0.83)  3 sự khác biệt
 *       beat 5 (0.81 → 1.00)  CTA tư vấn
 *   - Progress dots indicator hiện ở rìa phải để user biết đang ở đâu.
 */

const IMG_CLOSED =
  'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=1800&auto=format&fit=crop&q=85';
const IMG_OPEN =
  'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?w=1800&auto=format&fit=crop&q=85';

function clamp(v: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Tính opacity của 1 beat theo tiến độ. Beat fade-in trong fadeIn% đầu,
 * giữ full opacity ở giữa, fade-out trong fadeOut% cuối của window.
 */
function beatOpacity(p: number, start: number, end: number, fade = 0.04) {
  if (p <= start || p >= end) return 0;
  const peak = start + fade;
  const holdEnd = end - fade;
  if (p < peak) return clamp((p - start) / fade);
  if (p > holdEnd) return clamp(1 - (p - holdEnd) / fade);
  return 1;
}

interface BeatProps {
  opacity: number;
  /** translateY nhẹ khi beat fade-in/out để có depth */
  yOffset?: number;
}

const PILLARS = [
  { mark: '◇\uFE0E', title: 'Minh bạch', body: 'Đá quý có giấy GIA / GRS / SSEF' },
  { mark: '◆\uFE0E', title: 'Bền vững', body: 'Vàng tái chế, bao bì tái sử dụng' },
  { mark: '○\uFE0E', title: 'Nhân văn', body: 'Hợp tác công bằng với nghệ nhân Việt' },
  { mark: '●\uFE0E', title: 'Đa dạng', body: 'Đội ngũ và khách hàng đa văn hoá' },
];

const DIFFS = [
  {
    eyebrow: '01 — Thiết kế',
    title: 'Mỗi món — một tác phẩm',
    body: 'Thiết kế đoạt giải JCK Las Vegas, hoàn thiện thủ công.',
  },
  {
    eyebrow: '02 — Cá nhân hoá',
    title: 'Kể câu chuyện riêng của bạn',
    body: 'Tư vấn 1:1, khắc tên, chọn đá theo cung mệnh.',
  },
  {
    eyebrow: '03 — Nguyên liệu',
    title: 'Vẻ đẹp bắt đầu từ nguồn gốc',
    body: 'Ngọc lục bảo Colombia, ruby Myanmar, sapphire Kashmir.',
  },
];

export default function AboutHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const el = sectionRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const rect = el.getBoundingClientRect();
      const sectionDocTop = window.scrollY + rect.top;
      // Section đầu trang: tính từ scrollY=0 để hoà mượt với navbar dismissal.
      const scrolled =
        sectionDocTop < window.innerHeight ? window.scrollY : -rect.top;
      setProgress(clamp(scrolled / total));
    }

    function onScroll() {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ===== Background eye-opening =====
  // Nén vào 10% scroll đầu + áp ease-out cubic → động tác mở mắt "bùng"
  // mạnh ngay những pixel scroll đầu rồi giảm tốc, mô phỏng cách mí mắt
  // thật mở (nhanh ban đầu, chậm khi gần mở hết).
  //
  // Với stage 600vh (= ~4500px scroll budget):
  //   scrollY=30  → linearP=0.067 → eyeP=19% (rõ ràng hé mở)
  //   scrollY=72  → linearP=0.16  → eyeP=41% (qua navbar = đã mở quá nửa)
  //   scrollY=200 → linearP=0.44  → eyeP=82% (gần mở hết)
  //   scrollY=450 → linearP=1.00  → eyeP=100% (mở hoàn toàn)
  const eyePLinear = clamp(progress / 0.1);
  const eyeP = 1 - Math.pow(1 - eyePLinear, 3);
  const closedOpacity = clamp(1 - eyeP * 1.4);
  const openOpacity = clamp(eyeP * 1.4);
  const blurClosed = (1 - eyeP) * 22;
  const brightnessOpen = 0.55 + eyeP * 0.45;
  const brightnessClosed = brightnessOpen * 0.7;
  const scaleClosed = 1.12 - eyeP * 0.12;
  const scaleOpen = 1 + (1 - eyeP) * 0.04;
  const lidHeight = (1 - eyeP) * 38;
  const vignetteOpacity = 0.65 - eyeP * 0.3;

  // ===== Dim overlay tổng — đảm bảo text foreground luôn đọc được =====
  // Khi eye đã mở, vẫn cần ~35% dim để text rõ trên ảnh sáng.
  const stageDim = 0.2 + clamp(progress * 1.5) * 0.25; // 0.2 → 0.45

  // ===== Beat opacities =====
  const b1 = beatOpacity(progress, 0.0, 0.2, 0.04);
  const b2 = beatOpacity(progress, 0.18, 0.4, 0.04);
  const b3 = beatOpacity(progress, 0.38, 0.62, 0.04);
  const b4 = beatOpacity(progress, 0.6, 0.83, 0.04);
  const b5 = beatOpacity(progress, 0.81, 1.0, 0.04);

  // Slide direction luân phiên trái/phải/trái cho cảm giác "lật trang"
  const ty = (op: number) => (1 - op) * 24; // beat càng mờ càng dịch xuống
  const tyUp = (op: number) => (1 - op) * -24;

  // ===== Progress dots — biểu thị 5 chương =====
  const beats = [b1, b2, b3, b4, b5];
  const beatLabels = ['Mở mắt', 'Khởi nguồn', 'Trụ cột', 'Khác biệt', 'Tư vấn'];
  const activeBeat = beats.indexOf(Math.max(...beats));

  // ===== Scroll hint — chỉ hiện ở chương đầu =====
  const hintOpacity = clamp(1 - progress * 8);

  return (
    <section
      ref={sectionRef}
      className="about-stage"
      aria-label="Câu chuyện PURE"
    >
      <div className="about-stage-sticky">
        {/* === Background layers === */}
        <div
          className="about-bg about-bg-closed"
          style={{
            opacity: closedOpacity,
            filter: `blur(${blurClosed.toFixed(2)}px) brightness(${brightnessClosed.toFixed(3)})`,
            transform: `scale(${scaleClosed.toFixed(3)})`,
          }}
        >
          <Image
            src={IMG_CLOSED}
            alt=""
            fill
            priority
            sizes="100vw"
            quality={85}
            className="about-bg-img"
          />
        </div>

        <div
          className="about-bg about-bg-open"
          style={{
            opacity: openOpacity,
            filter: `brightness(${brightnessOpen.toFixed(3)})`,
            transform: `scale(${scaleOpen.toFixed(3)})`,
          }}
        >
          <Image
            src={IMG_OPEN}
            alt="Người mẫu đeo bông tai sapphire — PURE Jewelry"
            fill
            priority
            sizes="100vw"
            quality={85}
            className="about-bg-img"
          />
        </div>

        <div
          className="about-lid about-lid-top"
          style={{ height: `${lidHeight.toFixed(2)}%` }}
          aria-hidden
        />
        <div
          className="about-lid about-lid-bottom"
          style={{ height: `${lidHeight.toFixed(2)}%` }}
          aria-hidden
        />

        <div
          className="about-vignette"
          style={{ opacity: vignetteOpacity }}
          aria-hidden
        />

        {/* Dim overlay đọc text */}
        <div
          className="about-stage-dim"
          style={{ opacity: stageDim }}
          aria-hidden
        />

        {/* === BEAT 1: Hero title === */}
        <div
          className="about-beat about-beat-center"
          style={{
            opacity: b1,
            transform: `translateY(${ty(b1).toFixed(1)}px)`,
            pointerEvents: b1 > 0.5 ? 'auto' : 'none',
          }}
        >
          <span className="about-beat-eyebrow">— GIỚI THIỆU PURE —</span>
          <h1 className="about-beat-title about-beat-title-xl">
            <span>Hé mở vẻ đẹp</span>
            <em>tỏa sáng từ bên trong</em>
          </h1>
          <p className="about-beat-sub">
            Mỗi viên đá là một câu chuyện. Cuộn xuống để chiêm ngưỡng.
          </p>
        </div>

        {/* === BEAT 2: Khởi nguồn === */}
        <div
          className="about-beat about-beat-left"
          style={{
            opacity: b2,
            transform: `translate(${(1 - b2) * -32}px, ${ty(b2).toFixed(1)}px)`,
          }}
        >
          <span className="about-beat-eyebrow">— Khởi nguồn —</span>
          <h2 className="about-beat-title">
            Sinh ra từ <em>tình yêu</em><br />với những viên đá tinh khiết
          </h2>
          <p className="about-beat-body">
            Năm 2018, giữa chuyến hành trình tới mỏ ngọc lục bảo Muzo, chúng
            tôi đứng lặng trước viên đá thô đầu tiên — ánh xanh thẳm, nguyên
            sơ. Khoảnh khắc ấy, một câu hỏi nảy ra: tại sao trang sức Việt
            không thể chạm tới sự tinh khiết như vậy?
          </p>
          <blockquote className="about-beat-quote">
            “Vẻ đẹp thật sự nằm ở câu chuyện đằng sau mỗi viên đá.”
          </blockquote>
        </div>

        {/* === BEAT 3: 4 trụ cột === */}
        <div
          className="about-beat about-beat-center"
          style={{
            opacity: b3,
            transform: `translateY(${tyUp(b3).toFixed(1)}px)`,
          }}
        >
          <span className="about-beat-eyebrow">— Bốn trụ cột —</span>
          <h2 className="about-beat-title">
            Cách chúng tôi <em>khác biệt</em>
          </h2>
          <div className="about-beat-pillars">
            {PILLARS.map((p, i) => {
              // Stagger: mỗi pillar fade-in cách nhau 0.015 trong window
              const localStart = 0.4 + i * 0.015;
              const op = beatOpacity(progress, localStart, 0.62, 0.025);
              return (
                <div
                  key={p.title}
                  className="about-pill-card"
                  style={{
                    opacity: op,
                    transform: `translateY(${(1 - op) * 18}px)`,
                  }}
                >
                  <span className="about-pill-mark" aria-hidden>
                    {p.mark}
                  </span>
                  <strong>{p.title}</strong>
                  <span className="about-pill-body">{p.body}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* === BEAT 4: 3 sự khác biệt === */}
        <div
          className="about-beat about-beat-right"
          style={{
            opacity: b4,
            transform: `translate(${(1 - b4) * 32}px, ${ty(b4).toFixed(1)}px)`,
          }}
        >
          <span className="about-beat-eyebrow">— Sự khác biệt —</span>
          <h2 className="about-beat-title">
            Ba điều làm nên <em>tinh hoa</em>
          </h2>
          <ul className="about-beat-diffs">
            {DIFFS.map((d, i) => {
              const localStart = 0.62 + i * 0.025;
              const op = beatOpacity(progress, localStart, 0.83, 0.025);
              return (
                <li
                  key={d.title}
                  style={{
                    opacity: op,
                    transform: `translateX(${(1 - op) * 24}px)`,
                  }}
                >
                  <span className="about-diff-eyebrow">{d.eyebrow}</span>
                  <strong>{d.title}</strong>
                  <span>{d.body}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* === BEAT 5: CTA === */}
        <div
          className="about-beat about-beat-center"
          style={{
            opacity: b5,
            transform: `translateY(${ty(b5).toFixed(1)}px)`,
            pointerEvents: b5 > 0.5 ? 'auto' : 'none',
          }}
        >
          <span className="about-beat-eyebrow">— Bắt đầu hành trình —</span>
          <h2 className="about-beat-title about-beat-title-xl">
            Để PURE kể câu chuyện <em>của bạn</em>
          </h2>
          <p className="about-beat-sub">
            Chuyên gia đá quý sẵn sàng tư vấn 1:1 — miễn phí, không ràng buộc.
          </p>
          <div className="about-beat-cta-row">
            <Link href="/tu-van" className="about-beat-cta about-beat-cta-primary">
              Đặt lịch tư vấn
            </Link>
            <Link href="/cua-hang" className="about-beat-cta about-beat-cta-ghost">
              Khám phá cửa hàng ↗
            </Link>
          </div>
        </div>

        {/* === Progress dots indicator === */}
        <ol className="about-stage-dots" aria-label="Tiến trình câu chuyện">
          {beatLabels.map((label, i) => (
            <li
              key={label}
              className={`about-stage-dot ${i === activeBeat ? 'is-active' : ''}`}
            >
              <span className="about-stage-dot-mark" aria-hidden />
              <span className="about-stage-dot-label">{label}</span>
            </li>
          ))}
        </ol>

        {/* === Scroll hint chỉ hiện đầu === */}
        <div
          className="about-stage-hint"
          style={{ opacity: hintOpacity, pointerEvents: hintOpacity > 0.5 ? 'auto' : 'none' }}
          aria-hidden
        >
          <span>CUỘN</span>
          <span className="about-stage-hint-line" />
        </div>
      </div>
    </section>
  );
}
