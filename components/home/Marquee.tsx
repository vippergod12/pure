interface Props {
  items?: string[];
}

const DEFAULT_ITEMS = [
  'BỘ SƯU TẬP MỚI 2026',
  'GIẤY KIỂM ĐỊNH ĐÁ QUÝ',
  'BẢO HÀNH TRỌN ĐỜI',
  'BẠC 925 & VÀNG 18K',
  'GIAO HÀNG TOÀN QUỐC',
  'NGỌC LỤC BẢO TỰ NHIÊN',
  'THỦ CÔNG TINH XẢO',
];

export default function Marquee({ items = DEFAULT_ITEMS }: Props) {
  const list = [...items, ...items, ...items];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {list.map((it, i) => (
          <span key={i} className="marquee-item">
            {it}
            <span className="marquee-sep">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
