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

## Thanh toán AppotaPay

Luồng thanh toán mới là “mua ngay” từ trang chi tiết sản phẩm:

1. Khách bấm **Thanh toán online** trên `/san-pham/:slug`.
2. Trang `/thanh-toan/:slug` lấy thông tin khách và gọi `/api/payments/appotapay/create`.
3. Server tạo `orders`, gọi AppotaPay `POST /api/v2/orders/payment`, nhận `payment.url` rồi chuyển khách sang AppotaPay.
4. AppotaPay gọi `notifyUrl` `/api/payments/appotapay/ipn` và redirect browser qua `/thanh-toan/ket-qua`.
5. Server verify `signature = HMAC_SHA256(data, APPOTAPAY_SECRET_KEY)`, decode `data`, đối chiếu số tiền và cập nhật trạng thái order.

Biến môi trường cần thêm:

```env
APPOTAPAY_ENV=sandbox
APPOTAPAY_PARTNER_CODE=
APPOTAPAY_API_KEY=
APPOTAPAY_SECRET_KEY=
APPOTAPAY_LANGUAGE=vi
APPOTAPAY_GATEWAY_URL=
APPOTAPAY_ACCOUNT_REF_ID=
APPOTAPAY_NOTIFY_URL=
APPOTAPAY_REDIRECT_URL=
```

Nếu `APPOTAPAY_NOTIFY_URL` / `APPOTAPAY_REDIRECT_URL` để trống, app dùng `NEXT_PUBLIC_SITE_URL` để tạo URL tuyệt đối. Khi test local, redirect browser có thể về `localhost`, nhưng IPN server-to-server cần public tunnel như ngrok hoặc deploy preview.

### Sandbox nạp tiền bằng AppotaPay

Trang test nạp tiền sandbox nằm tại:

```txt
/sandbox/nap-tien
```

Luồng này tạo record trong bảng `orders` với mã bắt đầu bằng `TOPUP`, provider `appotapay_sandbox_topup`, rồi gọi AppotaPay sandbox như một giao dịch thanh toán bình thường. Khi AppotaPay trả IPN/return hợp lệ, hệ thống cập nhật `status`, `paid_at`, mã giao dịch và payload như đơn hàng AppotaPay.

Điều kiện để dùng:

```env
APPOTAPAY_ENV=sandbox
APPOTAPAY_PARTNER_CODE=
APPOTAPAY_API_KEY=
APPOTAPAY_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=https://your-public-url
APPOTAPAY_NOTIFY_URL=https://your-public-url/api/payments/appotapay/ipn
APPOTAPAY_REDIRECT_URL=https://your-public-url/thanh-toan/ket-qua
```

Route tạo giao dịch sandbox sẽ từ chối chạy nếu `APPOTAPAY_ENV=production`, để tránh tạo giao dịch thật ngoài ý muốn. Các giao dịch TOPUP cũng hiển thị trong `/admin/orders` để kiểm tra trạng thái.

## Thanh toán MoMo Merchant API chính thức

Luồng MoMo chính thức dùng One-Time Payment `captureWallet`:

1. Khách chọn **MoMo Merchant** trên `/thanh-toan/:slug`.
2. Server tạo `orders`, gọi MoMo `POST /v2/gateway/api/create`, nhận `payUrl` rồi chuyển khách sang MoMo.
3. Sau khi khách quét QR/xác nhận trong ví MoMo, MoMo gọi IPN `POST /api/payments/momo/ipn`.
4. Server verify `signature` bằng `MOMO_SECRET_KEY`, đối chiếu `partnerCode`, `orderId`, `amount`, rồi cập nhật order:
   - `resultCode = 0` -> `status = paid`, set `paid_at`.
   - Đang xử lý -> `status = processing`.
   - Thất bại -> `status = failed`.
5. Browser redirect qua `/api/payments/momo/return` chỉ để hiển thị kết quả; IPN vẫn là nguồn cập nhật chính.

Biến môi trường cần thêm:

```env
MOMO_ENV=sandbox
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_LANG=vi
MOMO_GATEWAY_URL=
MOMO_STORE_NAME=
MOMO_STORE_ID=
MOMO_IPN_URL=
MOMO_REDIRECT_URL=
```

Nếu `MOMO_IPN_URL` / `MOMO_REDIRECT_URL` để trống, app dùng `NEXT_PUBLIC_SITE_URL`.
Khi test local, bắt buộc dùng URL public như ngrok hoặc Vercel preview vì MoMo không gọi được `localhost`.

Sau khi cập nhật code, chạy lại schema một lần:

```bash
npm run db:init
```

### Test bằng QR MoMo/ZaloPay thủ công

Khi chưa có merchant keys chính thức của MoMo/ZaloPay, bạn có thể bật lựa chọn QR thủ công ở checkout. Luồng này chỉ tạo đơn, hiển thị mã QR và nội dung chuyển khoản; shop cần tự kiểm tra giao dịch rồi xác nhận đơn.

```env
MOMO_QR_IMAGE_URL=/payments/momo-qr.png
MOMO_RECEIVER_NAME=PURE
MOMO_RECEIVER_ACCOUNT=0900000000
ZALOPAY_QR_IMAGE_URL=/payments/zalopay-qr.png
ZALOPAY_RECEIVER_NAME=PURE
ZALOPAY_RECEIVER_ACCOUNT=0900000000
```

Đặt ảnh QR vào `public/payments/`. Không dùng luồng thủ công để tự động đánh dấu đơn đã thanh toán; để tự động xác nhận cần tích hợp API/webhook chính thức do từng ví cấp cho merchant.

Chạy lại schema sau khi cập nhật code:

```bash
npm run db:init
```

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
