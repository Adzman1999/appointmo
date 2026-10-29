UPDATE users
SET role = 'access_guest', updated_at = NOW()
WHERE role = 'demo_guest';
