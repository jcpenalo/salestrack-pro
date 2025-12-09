-- 1. Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow view access for Admins and Creators" ON audit_logs;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON audit_logs;

-- 3. Create SELECT Policy (View)
-- Allows users with role 'admin' or 'creator' to view all logs
CREATE POLICY "Allow view access for Admins and Creators"
ON audit_logs FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'creator')
  )
);

-- 4. Create INSERT Policy
-- Allows any authenticated user to write logs (e.g. "User updated profile")
CREATE POLICY "Allow insert for authenticated users"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
