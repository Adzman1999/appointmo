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
      booked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      is_guest_booking BOOLEAN NOT NULL DEFAULT false,
      recipient_name VARCHAR(255),
      recipient_email VARCHAR(255),
      recipient_phone VARCHAR(50),
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

    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_guest_booking BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50);

    CREATE INDEX IF NOT EXISTS idx_appointments_staff_time ON appointments (staff_id, start_time, end_time) WHERE status NOT IN ('cancelled');
    CREATE INDEX IF NOT EXISTS idx_appointments_ref ON appointments (booking_reference);
    CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments (business_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_appointments_booker ON appointments (booked_by_user_id, start_time DESC) WHERE booked_by_user_id IS NOT NULL;

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

    -- Multi-Business & Store Details Extensions
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'Beauty & Wellness';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Quezon City';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(100) DEFAULT '9:00 AM - 6:00 PM';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website VARCHAR(255);
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS social_handle VARCHAR(100);
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
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

    -- Customer reviews for stores, services, and staff
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
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS staff_rating SMALLINT CHECK (staff_rating >= 1 AND staff_rating <= 5);
    CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews (business_id, rating DESC);
    CREATE INDEX IF NOT EXISTS idx_reviews_staff_rating ON reviews (staff_id, staff_rating DESC) WHERE staff_id IS NOT NULL AND staff_rating IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_customer_review_per_appointment
      ON reviews (appointment_id) WHERE appointment_id IS NOT NULL AND user_id IS NOT NULL;

    -- Ensure approval status columns exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';

    -- Allow notifications without business_id or with system/superadmin recipient_type
    ALTER TABLE notifications ALTER COLUMN business_id DROP NOT NULL;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

    -- Store recent credentials snapshot for Super Admin inspection
    ALTER TABLE users ADD COLUMN IF NOT EXISTS recent_credentials JSONB;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason TEXT;

    -- HRIS & Staff Compensation & Payroll Extensions
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Philippines';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS state_province VARCHAR(100);
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;

    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT 'Specialist';
    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Full-Time'; -- Full-Time, Part-Time, Contractor
    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS base_salary NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) DEFAULT 0.00; -- Percentage e.g. 10.00%
    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
    ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

    -- Payroll Ledger & Compensation Records
    CREATE TABLE IF NOT EXISTS payroll_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      pay_period_start DATE NOT NULL,
      pay_period_end DATE NOT NULL,
      base_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      commission_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      bonuses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      net_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      payment_status VARCHAR(50) NOT NULL DEFAULT 'paid', -- pending, paid
      payment_date TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_payroll_business ON payroll_records (business_id, staff_id);
