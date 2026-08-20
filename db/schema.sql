-- 360 NFC Valet — Super Admin Console schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'super_admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  area        TEXT NOT NULL,
  city        TEXT NOT NULL DEFAULT 'Dubai',
  slug        TEXT UNIQUE NOT NULL,
  zones_count INT NOT NULL DEFAULT 4,
  slots_count INT NOT NULL DEFAULT 160,
  card_pool   INT NOT NULL DEFAULT 200,
  uid_start   BIGINT NOT NULL DEFAULT 7001,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zones (
  id          SERIAL PRIMARY KEY,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  slot_count  INT NOT NULL DEFAULT 45,
  UNIQUE (property_id, code)
);

CREATE TABLE IF NOT EXISTS drivers (
  id              SERIAL PRIMARY KEY,
  valet_id        TEXT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL,
  initials        TEXT NOT NULL,
  avatar_color    TEXT NOT NULL DEFAULT '#1C2B46',
  email           TEXT UNIQUE,
  phone           TEXT,
  emirates_id     TEXT,
  license_number  TEXT,
  nationality     TEXT,
  emergency_contact TEXT,
  pin             TEXT,
  password_hash   TEXT,
  property_id     INT REFERENCES properties(id),
  status          TEXT NOT NULL DEFAULT 'off_duty',
  shift_started_at TIMESTAMPTZ,
  role            TEXT NOT NULL DEFAULT 'driver',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nfc_cards (
  id          SERIAL PRIMARY KEY,
  uid         TEXT UNIQUE NOT NULL,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'ready',
  uses_count  INT NOT NULL DEFAULT 0,
  lost_at     DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offers (
  id               SERIAL PRIMARY KEY,
  property_id      INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  was_price        NUMERIC(10,2),
  description      TEXT,
  featured         INT,
  live             BOOLEAN NOT NULL DEFAULT false,
  draft            BOOLEAN NOT NULL DEFAULT false,
  validates_valet  BOOLEAN NOT NULL DEFAULT true,
  ends_on          DATE,
  views_7d         INT NOT NULL DEFAULT 0,
  rating           NUMERIC(2,1) NOT NULL DEFAULT 0,
  reviews          INT NOT NULL DEFAULT 0,
  level            TEXT,
  opens_at         TIME,
  closes_at        TIME,
  staff_code       TEXT,
  deal_tag         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  property_id INT NOT NULL REFERENCES properties(id),
  card_id     INT REFERENCES nfc_cards(id),
  driver_id   INT REFERENCES drivers(id),
  plate       TEXT NOT NULL,
  car_make    TEXT,
  car_model   TEXT,
  car_color   TEXT,
  zone        TEXT,
  slot        TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  dropped_at  TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  guest_eta   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_property_status ON orders(property_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_returned ON orders(returned_at);
CREATE INDEX IF NOT EXISTS idx_cards_property ON nfc_cards(property_id);
CREATE INDEX IF NOT EXISTS idx_drivers_property ON drivers(property_id);
CREATE INDEX IF NOT EXISTS idx_offers_property ON offers(property_id);

CREATE TABLE IF NOT EXISTS validations (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id),
  offer_id    INT REFERENCES offers(id),
  outlet      TEXT,
  qty         INT NOT NULL DEFAULT 1,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  admin_id    INT REFERENCES admins(id) ON DELETE CASCADE,
  driver_id   INT REFERENCES drivers(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validations_created ON validations(created_at);
CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token_hash);
