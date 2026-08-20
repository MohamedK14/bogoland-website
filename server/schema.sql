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
