ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS operational_status VARCHAR(32) NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS temporary_closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS expected_reopen_at TIMESTAMPTZ;

UPDATE businesses
SET operational_status = 'temporarily_closed', status = 'approved', updated_at = NOW()
WHERE status = 'closed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_operational_status_check'
      AND conrelid = 'businesses'::regclass
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_operational_status_check
      CHECK (operational_status IN ('open', 'temporarily_closed'));
  END IF;
END $$;
