DO $$
BEGIN
  IF to_regclass('public.access_requests') IS NOT NULL
     AND to_regclass('public.demo_access_requests') IS NOT NULL THEN
    RAISE EXCEPTION 'Both access_requests and demo_access_requests exist; merge their data before migrating.';
  ELSIF to_regclass('public.access_requests') IS NULL
     AND to_regclass('public.demo_access_requests') IS NOT NULL THEN
    ALTER TABLE demo_access_requests RENAME TO access_requests;
  END IF;

  IF to_regclass('public.access_invitations') IS NOT NULL
     AND to_regclass('public.demo_invitations') IS NOT NULL THEN
    RAISE EXCEPTION 'Both access_invitations and demo_invitations exist; merge their data before migrating.';
  ELSIF to_regclass('public.access_invitations') IS NULL
     AND to_regclass('public.demo_invitations') IS NOT NULL THEN
    ALTER TABLE demo_invitations RENAME TO access_invitations;
  END IF;

  IF to_regclass('public.access_sessions') IS NOT NULL
     AND to_regclass('public.demo_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'Both access_sessions and demo_sessions exist; merge their data before migrating.';
  ELSIF to_regclass('public.access_sessions') IS NULL
     AND to_regclass('public.demo_sessions') IS NOT NULL THEN
    ALTER TABLE demo_sessions RENAME TO access_sessions;
  END IF;

  IF to_regclass('public.idx_access_requests_email') IS NULL
     AND to_regclass('public.idx_demo_req_email') IS NOT NULL THEN
    ALTER INDEX idx_demo_req_email RENAME TO idx_access_requests_email;
  END IF;

  IF to_regclass('public.idx_access_sessions_token') IS NULL
     AND to_regclass('public.idx_demo_sessions_token') IS NOT NULL THEN
    ALTER INDEX idx_demo_sessions_token RENAME TO idx_access_sessions_token;
  END IF;
END $$;

UPDATE audit_logs
SET target_type = 'access_requests'
WHERE target_type = 'demo_access_requests';

UPDATE audit_logs
SET action = 'approve_access_request'
WHERE action = 'approve_demo_request';
