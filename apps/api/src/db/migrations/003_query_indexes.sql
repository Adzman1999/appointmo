CREATE INDEX IF NOT EXISTS idx_users_business_role_status
  ON users (business_id, role, status);

CREATE INDEX IF NOT EXISTS idx_services_business_active
  ON services (business_id, is_active, name);

CREATE INDEX IF NOT EXISTS idx_staff_services_service
  ON staff_services (service_id, staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_working_hours_staff_day
  ON staff_working_hours (staff_id, day_of_week, start_time);

CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff_range
  ON staff_time_off (staff_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_time
  ON appointments (customer_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_business_status_time
  ON appointments (business_id, status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_customers_business_email_lower
  ON customers (business_id, LOWER(email));

CREATE INDEX IF NOT EXISTS idx_access_requests_email_lower
  ON access_requests (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_access_invitations_request_created
  ON access_invitations (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_sessions_request_expiry
  ON access_sessions (request_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_business_period
  ON payroll_records (business_id, pay_period_start DESC, created_at DESC);
