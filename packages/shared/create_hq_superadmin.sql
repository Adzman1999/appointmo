-- ==============================================================================
-- Appointmo HeadQuarters (HQ) Fixed Super Admin Credentials Script
-- Role: platform_admin (Super Admin / HQ)
-- Target: Grants full gatekeeper authority to approve/reject stores
-- ==============================================================================

-- 1. Ensure required table columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';

-- 2. Fixed HQ Credentials:
-- Email: hq@appointmo.com (or superadmin@appointmo.local)
-- Password: HeadQuarters2026!
-- Bcrypt Hash (10 rounds): $2a$10$DCmLV6V4ac4.Hr8Xnv5aMu9Hsa8sEIaqIABTbXJpP/zsm5KQglE/y

INSERT INTO users (business_id, email, password_hash, role, name, status)
VALUES (
  NULL,
  'hq@appointmo.com',
  '$2a$10$DCmLV6V4ac4.Hr8Xnv5aMu9Hsa8sEIaqIABTbXJpP/zsm5KQglE/y',
  'platform_admin',
  'Appointmo HeadQuarters Super Admin',
  'approved'
)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  role = 'platform_admin',
  status = 'approved',
  name = 'Appointmo HeadQuarters Super Admin';

-- Also insert/update superadmin@appointmo.local alias with same password
INSERT INTO users (business_id, email, password_hash, role, name, status)
VALUES (
  NULL,
  'superadmin@appointmo.local',
  '$2a$10$DCmLV6V4ac4.Hr8Xnv5aMu9Hsa8sEIaqIABTbXJpP/zsm5KQglE/y',
  'platform_admin',
  'Appointmo HeadQuarters Super Admin',
  'approved'
)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  role = 'platform_admin',
  status = 'approved',
  name = 'Appointmo HeadQuarters Super Admin';
