-- Run this once against your Neon database (via the Neon SQL editor, or
-- `psql "$DATABASE_URL" -f schema.sql`) before starting the server.

CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  name_fr        TEXT NOT NULL,
  name_en        TEXT NOT NULL,
  category       TEXT NOT NULL,
  price          INTEGER NOT NULL,
  images         TEXT[] NOT NULL DEFAULT '{}',
  description_fr TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  date_added     DATE NOT NULL DEFAULT CURRENT_DATE,
  in_stock       BOOLEAN NOT NULL DEFAULT true,
  click_count    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  name_fr    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  image      TEXT NOT NULL DEFAULT '',
  available  BOOLEAN NOT NULL DEFAULT true
);

-- Customer accounts (separate from the single hardcoded admin account).
CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per WhatsApp checkout made while logged in (guests don't create
-- rows here — that's unchanged). order_items snapshots name/price/image at
-- purchase time so history stays accurate even if the product is later
-- edited or deleted.
CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name_fr    TEXT NOT NULL,
  price      INTEGER NOT NULL,
  qty        INTEGER NOT NULL,
  image      TEXT NOT NULL DEFAULT ''
);
