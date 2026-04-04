-- ============================================================
-- SALOON APP — Women's Salon Booking Platform
-- Database Schema + RLS
-- Based on Qass app schema (adapted for women's salon)
-- ============================================================
-- Run this in Supabase SQL Editor (full file, one shot)
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('customer', 'owner', 'stylist', 'admin');

CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled_by_customer',
  'cancelled_by_shop',
  'completed',
  'no_show'
);

CREATE TYPE day_of_week AS ENUM (
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday'
);


-- ============================================================
-- 2. PROFILES
-- Extends auth.users — one row per user
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'customer',
  full_name   TEXT,
  phone       TEXT UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'One profile per auth user. Role: customer, owner, stylist, admin';


-- ============================================================
-- 3. SHOPS (Salons)
-- Owned by a user with role = owner
-- ============================================================

CREATE TABLE shops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description   TEXT,
  address      TEXT,
  city         TEXT DEFAULT 'Kuwait City',
  phone        TEXT,
  images       TEXT[],        -- array of image URLs
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE shops IS 'Salon listings. Each shop belongs to one owner.';
CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_is_active ON shops(is_active);


-- ============================================================
-- 4. STYLISTS
-- Staff members within a salon.
-- profile_id is nullable — stylist may not have app account yet.
-- ============================================================

CREATE TABLE stylists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  bio         TEXT,
  photo_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stylists IS 'Individual stylists/staff. Can optionally be linked to a profiles row.';
CREATE INDEX idx_stylists_shop_id ON stylists(shop_id);
CREATE INDEX idx_stylists_profile_id ON stylists(profile_id);


-- ============================================================
-- 5. SERVICES
-- Available services offered by a salon.
-- ============================================================

CREATE TABLE services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  duration_min INT NOT NULL DEFAULT 30,
  price       DECIMAL(10,3) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE services IS 'Services offered by a salon (haircut, nails, makeup, etc.)';
CREATE INDEX idx_services_shop_id ON services(shop_id);


-- ============================================================
-- 6. STYLIST SCHEDULES
-- Weekly working hours per stylist.
-- ============================================================

CREATE TABLE stylist_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id  UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  open_time   TIME NOT NULL,
  close_time  TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(stylist_id, day_of_week)
);

COMMENT ON TABLE stylist_schedules IS 'Weekly schedule for each stylist';
CREATE INDEX idx_stylist_schedules_stylist_id ON stylist_schedules(stylist_id);


-- ============================================================
-- 7. BOOKINGS
-- Customer appointments with a stylist at a salon.
-- ============================================================

CREATE TABLE bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  stylist_id    UUID REFERENCES stylists(id) ON DELETE SET NULL,
  service_id    UUID REFERENCES services(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  time          TIME NOT NULL,
  end_time      TIME NOT NULL,
  status        booking_status NOT NULL DEFAULT 'pending',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bookings IS 'Customer appointments with stylists at salons';
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_shop_id ON bookings(shop_id);
CREATE INDEX idx_bookings_stylist_id ON bookings(stylist_id);
CREATE INDEX idx_bookings_date ON bookings(date);


-- ============================================================
-- 8. REVIEWS
-- Customer reviews for completed bookings.
-- ============================================================

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reviews IS 'Customer reviews for salons';
CREATE INDEX idx_reviews_shop_id ON reviews(shop_id);
CREATE UNIQUE INDEX idx_reviews_booking_id ON reviews(booking_id);


-- ============================================================
-- 9. FUNCTIONS + TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_updated_at
  BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_updated_at
  BEFORE UPDATE ON stylists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_updated_at
  BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- current_user_role() helper
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin()
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT current_user_role() = 'admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: owns_shop(shop_id)
CREATE OR REPLACE FUNCTION owns_shop(shop_uuid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM shops WHERE id = shop_uuid AND owner_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- PROFILES policies
CREATE POLICY "Profiles: public read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: self update" ON profiles FOR UPDATE USING (auth.uid() = id);


-- SHOPS policies
CREATE POLICY "Shops: public read" ON shops FOR SELECT USING (is_active = true);
CREATE POLICY "Shops: owner read" ON shops FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Shops: owner insert" ON shops FOR INSERT WITH CHECK (
  owner_id = auth.uid() AND current_user_role() IN ('owner', 'stylist_admin')
);
CREATE POLICY "Shops: owner update" ON shops FOR UPDATE USING (
  owner_id = auth.uid() OR is_admin()
);
CREATE POLICY "Shops: owner delete" ON shops FOR DELETE USING (owner_id = auth.uid());


-- STYLISTS policies
CREATE POLICY "Stylists: public read" ON stylists FOR SELECT USING (is_active = true);
CREATE POLICY "Stylists: owner manage" ON stylists FOR ALL USING (
  owns_shop(shop_id) OR is_admin()
);


-- SERVICES policies
CREATE POLICY "Services: public read" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Services: owner manage" ON services FOR ALL USING (
  owns_shop(shop_id) OR is_admin()
);


-- STYLIST SCHEDULES policies
CREATE POLICY "Schedules: public read" ON stylist_schedules FOR SELECT USING (is_active = true);
CREATE POLICY "Schedules: owner manage" ON stylist_schedules FOR ALL USING (
  owns_shop((SELECT shop_id FROM stylists WHERE id = stylist_schedules.stylist_id)) OR is_admin()
);


-- BOOKINGS policies
CREATE POLICY "Bookings: customer read own" ON bookings FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Bookings: shop read own" ON bookings FOR SELECT USING (owns_shop(shop_id));
CREATE POLICY "Bookings: shop insert" ON bookings FOR INSERT WITH CHECK (
  owns_shop(shop_id) OR customer_id = auth.uid()
);
CREATE POLICY "Bookings: shop update" ON bookings FOR UPDATE USING (
  owns_shop(shop_id) OR is_admin()
);
CREATE POLICY "Bookings: customer cancel" ON bookings FOR UPDATE USING (
  customer_id = auth.uid() AND status IN ('pending', 'confirmed')
);


-- REVIEWS policies
CREATE POLICY "Reviews: public read" ON reviews FOR SELECT USING (true);
CREATE POLICY "Reviews: customer insert" ON reviews FOR INSERT WITH CHECK (
  customer_id = auth.uid() AND (
    SELECT status FROM bookings WHERE id = booking_id
  ) = 'completed'
);
CREATE POLICY "Reviews: customer update own" ON reviews FOR UPDATE USING (customer_id = auth.uid());


-- ============================================================
-- 11. SEED DATA — Sample salon services
-- ============================================================

-- Note: Sample data will be inserted when a salon owner creates their shop
