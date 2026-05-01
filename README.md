# PURE — Shop trang sức & phụ kiện đá quý

Website bán trang sức đá quý cao cấp (ngọc lục bảo, ruby, sapphire, kim cương, ngọc trai…)
với SEO tối đa và admin panel quản lý sản phẩm.

- Frontend: **Next.js 14 (App Router)** + TypeScript + ISR 60s
- Backend: Next.js Route Handlers `/api/*` (auth + categories + products)
- Database: **Neon (Postgres serverless)** qua `@neondatabase/serverless`
- SEO: SSR/ISR cho mọi trang public, Metadata API per-page, JSON-LD, sitemap động
- Deploy: 1-click trên Vercel
- Không có giỏ hàng / thanh toán / đăng ký user. Khách liên hệ qua **Zalo**.
  Có **một tài khoản admin** để CRUD sản phẩm.

---

## Cấu trúc

```
shop/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout (font, metadata, providers)
│   ├── globals.css            # CSS toàn cục (theme emerald + champagne)
│   ├── (public)/              # Layout public: Navbar + Footer + FloatingActions
│   │   ├── page.tsx           # Trang chủ (Server Component, ISR 60s)
│   │   ├── cua-hang/          # Cửa hàng (lọc theo danh mục)
│   │   ├── danh-muc/[slug]/   # Trang danh mục
│   │   └── san-pham/[slug]/   # Chi tiết sản phẩm + JSON-LD + Zalo CTA
│   ├── admin/                 # Admin panel (JWT localStorage)
│   ├── api/                   # Route Handlers
│   │   ├── auth/{login,me}/
│   │   ├── categories/[id]/
│   │   ├── products/{[id],featured,hero}/
│   │   └── home/              # Bundle data trang chủ (1 request)
│   ├── sitemap.ts             # /sitemap.xml động từ DB
│   └── robots.ts              # /robots.txt
├── components/
│   ├── home/                  # Hero, Marquee, HotBento, TrendingGrid, Story, BigCTA
│   └── *.tsx                  # Navbar, Footer, ProductCard, Modal, ImagePicker…
├── lib/
│   ├── data.ts                # Server-side fetcher (ISR-aware)
│   ├── api-client.ts          # Client-side API wrapper
│   ├── seo/                   # siteConfig + JSON-LD helpers
│   ├── server/                # db (Neon), auth (JWT), http helpers
│   ├── utils/                 # format, sale, zalo, image
│   └── types.ts
├── db/schema.sql              # Schema Postgres
├── scripts/                   # init-db, seed (đá quý)
├── public/favicon.svg
├── next.config.mjs
└── package.json
```

---

## Yêu cầu

- Node.js >= 18
- Tài khoản Neon: <https://console.neon.tech> (miễn phí)

## Cài đặt

```bash
npm install
copy .env.example .env       # Windows
# hoặc: cp .env.example .env  # macOS / Linux
```

Mở `.env` và điền:

| Biến                              | Ý nghĩa                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | Connection string Neon (chọn _Pooled connection_, có `?sslmode=require`).          |
| `JWT_SECRET`                      | Chuỗi ngẫu nhiên để ký token admin. Tối thiểu 32 ký tự ngẫu nhiên.                 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Tài khoản admin sẽ được seed.                                                    |
| `NEXT_PUBLIC_SITE_URL`            | Domain production (vd `https://pure.vn`). Quan trọng cho SEO + sitemap.          |
| `NEXT_PUBLIC_ZALO_PHONE`          | SĐT Zalo của shop (vd `0987654321`). Dùng cho nút "Liên hệ Zalo".                  |
| `NEXT_PUBLIC_ZALO_URL`            | (Tùy chọn) Link Zalo OA đầy đủ. Nếu set sẽ ghi đè `NEXT_PUBLIC_ZALO_PHONE`.        |
| `WARM_SECRET`                     | (Tùy chọn) Secret bảo vệ endpoint `/api/_warm` cho cron giữ DB warm.               |

## Khởi tạo database

```bash
npm run db:init     # tạo bảng (categories, products, admins)
npm run db:seed     # seed admin + 7 danh mục + 22 sản phẩm trang sức đá quý
```

> Cả hai script có thể chạy lại nhiều lần. `db:init` dùng `IF NOT EXISTS`,
> `db:seed` dùng `ON CONFLICT DO ...`.

## Chạy local

```bash
npm run dev
```

- Frontend + API: <http://localhost:3000>
- Trang admin: <http://localhost:3000/admin/login> — đăng nhập bằng
  `ADMIN_USERNAME` / `ADMIN_PASSWORD` trong `.env`.

---

## Deploy lên Vercel

1. Đẩy code lên GitHub.
2. Vào <https://vercel.com> → **Add New Project** → import repo.
3. Vercel tự nhận diện Next.js (Build Command: `next build`).
4. **Settings → Environment Variables** thêm:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_SITE_URL` (vd `https://pure.vn`)
   - `NEXT_PUBLIC_ZALO_PHONE` (hoặc `NEXT_PUBLIC_ZALO_URL`)
5. Bấm **Deploy**.

Sau khi deploy lần đầu, từ máy local chạy `npm run db:init && npm run db:seed`
để khởi tạo dữ liệu lên DB Neon production (vì `.env` của bạn đã trỏ thẳng tới Neon).

---

## Bộ danh mục mẫu (gồm 22 sản phẩm)

- Nhẫn đá quý (ngọc lục bảo, ruby, sapphire, kim cương)
- Vòng cổ (ngọc lục bảo, ngọc trai Tahiti, ruby pendant)
- Mặt dây chuyền (sapphire, thạch anh tím, ngọc lục bảo trái tim)
- Hoa tai (ngọc trai Akoya, ruby stud, sapphire halo)
- Vòng tay (ngọc bích Myanmar, lắc tennis kim cương, charm bạc 925)
- Bộ trang sức (cô dâu ngọc lục bảo, set ngọc trai 3 món)
- Charm & Phụ kiện (charm bạc, đá thạch anh hồng, hộp đựng trang sức da)

---

## API Endpoints

| Method | Path                            | Auth  | Mô tả                                                                |
| ------ | ------------------------------- | ----- | -------------------------------------------------------------------- |
| POST   | `/api/auth/login`               | —     | Đăng nhập admin, trả về JWT                                          |
| GET    | `/api/auth/me`                  | Admin | Trả về thông tin admin từ token                                      |
| GET    | `/api/categories`               | —     | Danh sách danh mục (kèm `product_count`)                             |
| POST   | `/api/categories`               | Admin | Tạo danh mục                                                         |
| GET    | `/api/categories/:id`           | —     | Lấy 1 danh mục (chấp nhận id hoặc slug)                              |
| PUT    | `/api/categories/:id`           | Admin | Cập nhật danh mục                                                    |
| DELETE | `/api/categories/:id`           | Admin | Xoá danh mục (cascade xoá sản phẩm)                                  |
| GET    | `/api/products?category=&q=`    | —     | Danh sách sản phẩm. `category` nhận id hoặc slug; `q` search theo tên |
| POST   | `/api/products`                 | Admin | Tạo sản phẩm                                                         |
| GET    | `/api/products/:id`             | —     | Lấy 1 sản phẩm                                                       |
| PUT    | `/api/products/:id`             | Admin | Cập nhật sản phẩm                                                    |
| DELETE | `/api/products/:id`             | Admin | Xoá sản phẩm                                                         |
| GET    | `/api/products/featured`        | —     | Sản phẩm được admin gắn nổi bật                                      |
| GET    | `/api/products/hero`            | —     | Sản phẩm hero của trang chủ                                          |
| GET    | `/api/home`                     | —     | Bundle dữ liệu trang chủ (categories + products + featured + hero)   |

Auth: gửi header `Authorization: Bearer <token>`.
Frontend tự lưu token trong `localStorage`.

---

## Tuỳ biến

- **Đổi tên thương hiệu**: chỉnh `lib/seo/siteConfig.ts` (`SITE_NAME`,
  `SITE_TAGLINE`, `SITE_DESCRIPTION`) và logo trong `components/Navbar.tsx`,
  `components/Footer.tsx`.
- **Đổi màu chủ đạo**: chỉnh các CSS variables `--primary`, `--accent`,
  `--emerald`, `--gold` ở đầu `app/globals.css`.
- **Thêm trường vào sản phẩm**: chỉnh `db/schema.sql` (thêm cột) → cập nhật
  type ở `lib/types.ts` → form admin ở `app/admin/products/page.tsx` → API
  routes trong `app/api/products/**.ts`.
- **Đổi tần suất ISR**: đổi `export const revalidate = 60` ở mỗi
  `app/(public)/.../page.tsx`.
- **Thêm admin khác**: chạy SQL trên Neon
  `INSERT INTO admins (username, password_hash) VALUES ('alice', '<bcrypt hash>')`.
  Tạo hash bằng:
  ```bash
  node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'mật_khẩu'
  ```

---

## Bản quyền

Dự án phát triển từ template trishop (MIT). Tự do sử dụng, chỉnh sửa.
