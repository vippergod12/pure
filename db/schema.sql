-- Schema cho Shop (Neon Postgres)

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(160) NOT NULL UNIQUE,
  image_url   TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  slug          VARCHAR(220) NOT NULL UNIQUE,
  description   TEXT,
  price         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sale_price    NUMERIC(12, 2),
  sale_end_at   TIMESTAMPTZ,
  image_url     TEXT,
  colors        TEXT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_hero       BOOLEAN NOT NULL DEFAULT FALSE,
  featured_rank INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price    NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_end_at   TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_rank INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hero       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors        TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products DROP COLUMN IF EXISTS stock;
ALTER TABLE products DROP COLUMN IF EXISTS sizes;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured_rank) WHERE featured_rank IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_hero ON products(is_hero) WHERE is_hero = TRUE;

-- Tối ưu cho ORDER BY p.is_active DESC, p.created_at DESC (list endpoint)
CREATE INDEX IF NOT EXISTS idx_products_listing
  ON products(is_active DESC, created_at DESC);

-- Tối ưu lookup theo slug (đã có UNIQUE nhưng ghi rõ ý đồ).
-- Postgres tự tạo index cho UNIQUE constraint, nên không cần index riêng.
-- (Để lại comment cho người đọc khỏi nhầm tưởng quên.)

-- Tối ưu name search (ILIKE %q%) cho thanh tìm kiếm.
-- pg_trgm cho phép GIN index hỗ trợ ILIKE pattern matching.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(80) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Yêu cầu tư vấn từ khách hàng (form công khai trên /tu-van)
CREATE TABLE IF NOT EXISTS consultations (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120),
  gender        VARCHAR(10),    -- 'male' | 'female' | 'other' | NULL
  phone         VARCHAR(30) NOT NULL,
  note          TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'new',  -- 'new' | 'contacted'
  contacted_at  TIMESTAMPTZ,                          -- NULL = chưa liên hệ
  source_ip     VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration cho DB cũ: thêm cột contacted_at nếu chưa có.
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_consultations_status_created
  ON consultations(status, created_at DESC);
