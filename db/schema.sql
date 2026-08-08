-- ============================================================================
--  Hotel Management System — PostgreSQL Schema (DDL)
--  เวอร์ชัน: Design Phase v1
--  หมายเหตุ: ออกแบบเน้นการกัน overbooking (ดู docs/03-anti-overbooking.md)
--            ต้องการ PostgreSQL 14+ (ใช้ gen_random_uuid, GENERATED, EXCLUDE)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist;    -- EXCLUDE constraint แบบช่วงวันที่

-- ============================================================================
--  ENUM types
-- ============================================================================
CREATE TYPE reservation_status AS ENUM
    ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
CREATE TYPE channel_type       AS ENUM ('direct', 'ical', 'channel_manager');
CREATE TYPE room_status        AS ENUM ('clean', 'occupied', 'dirty', 'cleaning', 'inspected', 'out_of_order');
CREATE TYPE message_channel    AS ENUM ('email', 'sms', 'line', 'whatsapp');
CREATE TYPE message_status     AS ENUM ('scheduled', 'sending', 'sent', 'delivered', 'failed', 'cancelled');
CREATE TYPE sync_direction     AS ENUM ('inbound', 'outbound');
CREATE TYPE sync_status        AS ENUM ('success', 'failed', 'partial');
CREATE TYPE payment_status     AS ENUM ('pending', 'paid', 'refunded', 'failed');

-- ============================================================================
--  กลุ่ม A — โครงสร้างที่พัก (Property Structure)
-- ============================================================================
CREATE TABLE organization (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE property (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    timezone      TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    currency      CHAR(3) NOT NULL DEFAULT 'THB',
    checkin_time  TIME NOT NULL DEFAULT '14:00',
    checkout_time TIME NOT NULL DEFAULT '12:00',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE room_type (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id   UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,                       -- เช่น "Deluxe", "Suite"
    code          TEXT,                                -- รหัสภายใน
    max_occupancy SMALLINT NOT NULL DEFAULT 2,
    base_price    NUMERIC(12,2) NOT NULL DEFAULT 0,    -- ราคาตั้งต้น (fallback)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (property_id, code)
);

CREATE TABLE room (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES room_type(id) ON DELETE RESTRICT,
    number       TEXT NOT NULL,                        -- เช่น "301"
    status       room_status NOT NULL DEFAULT 'clean',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (property_id, number)
);

-- ============================================================================
--  กลุ่ม B — ราคา & สต็อก (Rates & Inventory)  🔒 หัวใจกัน overbooking
-- ============================================================================
CREATE TABLE rate_plan (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL REFERENCES room_type(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,                        -- เช่น "รวมอาหารเช้า"
    refundable   BOOLEAN NOT NULL DEFAULT true,
    min_stay     SMALLINT NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ราคาต่อวัน (room_type × rate_plan × date)
CREATE TABLE rate (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_plan_id UUID NOT NULL REFERENCES rate_plan(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    price        NUMERIC(12,2) NOT NULL,
    UNIQUE (rate_plan_id, date)
);

-- สต็อกห้องต่อวัน — ตัดสต็อกแบบ atomic ที่นี่
CREATE TABLE availability (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES room_type(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    units_total  SMALLINT NOT NULL,                    -- ห้องทั้งหมดของประเภทนี้
    units_sold   SMALLINT NOT NULL DEFAULT 0,          -- ขายไปแล้ว
    stop_sell    BOOLEAN NOT NULL DEFAULT false,       -- ปิดขายวันนี้
    UNIQUE (room_type_id, date),
    -- ⛔ ด่านสุดท้าย: ฐานข้อมูลปฏิเสธการขายเกินเสมอ
    CONSTRAINT chk_no_oversell CHECK (units_sold >= 0 AND units_sold <= units_total)
);
CREATE INDEX idx_availability_lookup ON availability (property_id, room_type_id, date);

-- ============================================================================
--  กลุ่ม C — การจอง (Reservations)
-- ============================================================================
CREATE TABLE guest (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name    TEXT NOT NULL,
    email        TEXT,
    phone        TEXT,
    locale       TEXT NOT NULL DEFAULT 'th',
    -- consent การสื่อสาร (PDPA) — แยกธุรกรรม vs การตลาด
    consent_transactional BOOLEAN NOT NULL DEFAULT true,
    consent_marketing     BOOLEAN NOT NULL DEFAULT false,
    -- หมายเหตุ: ข้อมูลอ่อนไหว (passport ฯลฯ) ควรเข้ารหัสระดับ app ก่อนเก็บ
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE channel (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
    type         channel_type NOT NULL,
    name         TEXT NOT NULL,                        -- เช่น "Booking.com", "Airbnb"
    credentials  JSONB,                                -- token/URL (เข้ารหัสก่อนเก็บ)
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reservation (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id   UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
    guest_id      UUID REFERENCES guest(id) ON DELETE SET NULL,
    channel_id    UUID REFERENCES channel(id) ON DELETE SET NULL,
    code          TEXT NOT NULL UNIQUE,                -- รหัสจองที่มนุษย์อ่านได้
    external_ref  TEXT,                                -- id ฝั่ง OTA
    status        reservation_status NOT NULL DEFAULT 'pending',
    total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency      CHAR(3) NOT NULL DEFAULT 'THB',
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 🔑 idempotency: กัน booking ซ้ำจาก OTA/webhook retry
    CONSTRAINT uq_channel_ref UNIQUE (channel_id, external_ref)
);

-- 1 บรรทัด = 1 ห้อง × ช่วงวัน (ตัวที่ผูก inventory)
CREATE TABLE reservation_room (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id  UUID NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
    room_type_id    UUID NOT NULL REFERENCES room_type(id) ON DELETE RESTRICT,
    rate_plan_id    UUID REFERENCES rate_plan(id) ON DELETE SET NULL,
    room_id         UUID REFERENCES room(id) ON DELETE SET NULL,  -- assign ตอนเช็คอิน
    checkin_date    DATE NOT NULL,
    checkout_date   DATE NOT NULL,
    guests_count    SMALLINT NOT NULL DEFAULT 1,
    price_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT chk_dates CHECK (checkout_date > checkin_date)
);
CREATE INDEX idx_resroom_overlap ON reservation_room (room_type_id, checkin_date, checkout_date);

-- ป้องกันห้องจริง (เมื่อ assign แล้ว) ถูกซ้อนช่วงวัน — ชั้นกันซ้ำระดับห้องจริง
ALTER TABLE reservation_room
    ADD CONSTRAINT excl_room_overlap
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(checkin_date, checkout_date, '[)') WITH &&
    ) WHERE (room_id IS NOT NULL);

-- ============================================================================
--  กลุ่ม D — ช่องทาง OTA (Mapping & Sync)
-- ============================================================================
CREATE TABLE channel_mapping (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id       UUID NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
    room_type_id     UUID NOT NULL REFERENCES room_type(id) ON DELETE CASCADE,
    rate_plan_id     UUID REFERENCES rate_plan(id) ON DELETE SET NULL,
    external_room_id TEXT NOT NULL,                    -- id ห้องฝั่ง OTA
    external_rate_id TEXT,                             -- id เรทฝั่ง OTA
    UNIQUE (channel_id, room_type_id, rate_plan_id)
);

CREATE TABLE sync_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id   UUID REFERENCES channel(id) ON DELETE SET NULL,
    direction    sync_direction NOT NULL,
    status       sync_status NOT NULL,
    payload      JSONB,                                -- request/response (debug/audit)
    error        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_synclog_channel_time ON sync_log (channel_id, created_at DESC);

-- ============================================================================
--  กลุ่ม E — การเงิน (Billing)
-- ============================================================================
CREATE TABLE folio (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id  UUID NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
    balance         NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE folio_item (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio_id     UUID NOT NULL REFERENCES folio(id) ON DELETE CASCADE,
    description  TEXT NOT NULL,                        -- "ค่าห้อง", "มินิบาร์"
    amount       NUMERIC(12,2) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio_id     UUID NOT NULL REFERENCES folio(id) ON DELETE CASCADE,
    amount       NUMERIC(12,2) NOT NULL,
    status       payment_status NOT NULL DEFAULT 'pending',
    gateway      TEXT,                                 -- 'omise', 'stripe'
    gateway_ref  TEXT,                                 -- token (❌ ไม่เก็บเลขบัตร)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
--  กลุ่ม F — สื่อสาร & ปฏิบัติการ
-- ============================================================================
CREATE TABLE message_template (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
    key          TEXT NOT NULL,                        -- 'booking_confirmation'
    locale       TEXT NOT NULL DEFAULT 'th',
    channel      message_channel NOT NULL,
    subject      TEXT,                                 -- สำหรับ email
    body         TEXT NOT NULL,                        -- มี {{placeholders}}
    UNIQUE (property_id, key, locale, channel)
);

CREATE TABLE message (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservation(id) ON DELETE CASCADE,
    template_id    UUID REFERENCES message_template(id) ON DELETE SET NULL,
    channel        message_channel NOT NULL,
    to_address     TEXT NOT NULL,                      -- email/phone/line id
    status         message_status NOT NULL DEFAULT 'scheduled',
    scheduled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at        TIMESTAMPTZ,
    error          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- worker ดึงงานที่ถึงเวลาส่ง
CREATE INDEX idx_message_due ON message (status, scheduled_at) WHERE status = 'scheduled';

CREATE TABLE housekeeping_task (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id      UUID NOT NULL REFERENCES room(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    task_type    TEXT NOT NULL DEFAULT 'cleaning',
    is_done      BOOLEAN NOT NULL DEFAULT false,
    assigned_to  UUID,                                 -- อ้าง app_user(id)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
--  ผู้ใช้งาน & Audit
-- ============================================================================
CREATE TABLE app_user (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'front_desk',  -- owner/manager/front_desk/housekeeping
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID REFERENCES app_user(id) ON DELETE SET NULL,
    entity       TEXT NOT NULL,                        -- 'reservation', 'availability'
    entity_id    TEXT NOT NULL,
    action       TEXT NOT NULL,                        -- 'create','update','cancel'
    diff         JSONB,                                -- ค่าเก่า → ใหม่
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id, created_at DESC);

-- ============================================================================
--  ตัวอย่างการตัดสต็อกแบบ atomic (ใช้ใน Reservation Engine, ครอบใน transaction)
--  ดูรายละเอียดเชิงลึกใน docs/03-anti-overbooking.md
-- ============================================================================
-- BEGIN;
--   -- 1) ล็อกแถวของทุกคืน เรียงตาม date เพื่อกัน deadlock
--   SELECT id FROM availability
--    WHERE room_type_id = :rt AND date >= :checkin AND date < :checkout
--    ORDER BY date
--    FOR UPDATE;
--   -- 2) ตัดสต็อก (ถ้าคืนใดเต็ม/stop_sell จำนวนแถวจะไม่ครบ → rollback)
--   UPDATE availability
--      SET units_sold = units_sold + 1
--    WHERE room_type_id = :rt AND date >= :checkin AND date < :checkout
--      AND stop_sell = false AND units_sold + 1 <= units_total;
--   -- 3) ถ้า affected rows < จำนวนคืน → ROLLBACK ('ห้องเต็ม')
--   -- 4) INSERT reservation + reservation_room
-- COMMIT;
-- ============================================================================
