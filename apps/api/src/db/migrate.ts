import { query, pool } from './index';

export const runMigrations = async () => {
  console.log('Running Appointmo database migrations...');

  await query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Businesses
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
      timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Manila',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Branches
    CREATE TABLE IF NOT EXISTS branches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Users (Business admins, staff logins, platform admin)
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'business_admin', -- platform_admin, business_admin, staff
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Services
    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Staff profiles
    CREATE TABLE IF NOT EXISTS staff_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      bio TEXT NOT NULL,
      avatar_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Staff-Service qualifications
    CREATE TABLE IF NOT EXISTS staff_services (
      staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      PRIMARY KEY (staff_id, service_id)
    );

    -- Staff working hours (day_of_week: 0=Sun, 1=Mon, ..., 6=Sat)
    CREATE TABLE IF NOT EXISTS staff_working_hours (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      break_start TIME,
      break_end TIME,
      is_working BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT valid_hours CHECK (start_time < end_time)
    );

    -- Staff time off
    CREATE TABLE IF NOT EXISTS staff_time_off (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_business_customer_email UNIQUE (business_id, email)
    );

    -- Appointments
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      booking_reference VARCHAR(20) UNIQUE NOT NULL,
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
      staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- pending, confirmed, completed, cancelled, rescheduled
      price_snapshot NUMERIC(10, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
      notes TEXT,
      cancellation_reason TEXT,
      management_token_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT valid_appointment_time CHECK (start_time < end_time)
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_staff_time ON appointments (staff_id, start_time, end_time) WHERE status NOT IN ('cancelled');
    CREATE INDEX IF NOT EXISTS idx_appointments_ref ON appointments (booking_reference);
    CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments (business_id, start_time);

    -- Appointment status history
    CREATE TABLE IF NOT EXISTS appointment_status_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      previous_status VARCHAR(50),
      new_status VARCHAR(50) NOT NULL,
      reason TEXT,
      changed_by VARCHAR(100) DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Demo Access Requests
    CREATE TABLE IF NOT EXISTS demo_access_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      business_name VARCHAR(255),
      message TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, revoked
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by VARCHAR(255),
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_demo_req_email ON demo_access_requests (email);

    -- Ensure any existing table has new columns
    ALTER TABLE demo_access_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE demo_access_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    ALTER TABLE demo_access_requests ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);

    -- Demo Invitations & Passcodes
    CREATE TABLE IF NOT EXISTS demo_invitations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      request_id UUID NOT NULL REFERENCES demo_access_requests(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) UNIQUE NOT NULL,
      raw_token_hint VARCHAR(50),
      attempt_count INT DEFAULT 0,
      max_attempts INT DEFAULT 5,
      expires_at TIMESTAMPTZ NOT NULL,
      redeemed_at TIMESTAMPTZ,
      used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      is_revoked BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE demo_invitations ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 0;
    ALTER TABLE demo_invitations ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 5;
    ALTER TABLE demo_invitations ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
    ALTER TABLE demo_invitations ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

    -- Password Setup / Reset Tokens (Single-use, short-lived, securely hashed)
    CREATE TABLE IF NOT EXISTS user_setup_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_user_setup_tokens_hash ON user_setup_tokens (token_hash);

    -- Demo Sessions (PostgreSQL-backed for immediate revocation)
    CREATE TABLE IF NOT EXISTS demo_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      request_id UUID NOT NULL REFERENCES demo_access_requests(id) ON DELETE CASCADE,
      session_token_hash VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_demo_sessions_token ON demo_sessions (session_token_hash);

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      actor_type VARCHAR(50) NOT NULL, -- platform_admin, business_user, customer, system
      actor_id VARCHAR(100),
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(100) NOT NULL,
      target_id VARCHAR(100),
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Notifications (Two-way persistent notifications for admin and customer)
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
      appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
      recipient_type VARCHAR(50) NOT NULL, -- 'admin' or 'customer'
      recipient_identifier VARCHAR(255) NOT NULL, -- 'admin' or customer email / booking reference
      type VARCHAR(50) NOT NULL, -- 'booking_created', 'booking_confirmed', 'booking_rescheduled', 'booking_cancelled'
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_type, recipient_identifier, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_appt ON notifications (appointment_id);

    -- Multi-Business & Branch Extensions
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'Beauty & Wellness';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_policies JSONB DEFAULT '{"requireApproval": false, "minLeadHours": 2, "maxAdvanceDays": 60}'::jsonb;

    ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
    ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
    ALTER TABLE branches ADD COLUMN IF NOT EXISTS location_description TEXT;

    ALTER TABLE services ADD COLUMN IF NOT EXISTS suitability_tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0;

    -- Branch-specific service offerings
    CREATE TABLE IF NOT EXISTS branch_services (
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      is_available BOOLEAN NOT NULL DEFAULT true,
      price_override NUMERIC(10, 2),
      PRIMARY KEY (branch_id, service_id)
    );

    -- Staff branch assignments
    CREATE TABLE IF NOT EXISTS staff_branches (
      staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      PRIMARY KEY (staff_id, branch_id)
    );

    -- Verified Synthetic Reviews
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
      service_id UUID REFERENCES services(id) ON DELETE SET NULL,
      appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
      customer_name VARCHAR(255) NOT NULL,
      rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews (business_id, rating DESC);
  `);

  console.log('✅ Migrations completed successfully.');
};

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
