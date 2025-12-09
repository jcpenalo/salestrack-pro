-- 1. Create a Secure Function to look up roles
-- This function runs with "SECURITY DEFINER" privileges (bypassing RLS)
-- It allows us to safely check the role of a user without exposing the whole users table
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. Update Audit Logs Policy to use this function
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view access for Admins and Creators" ON audit_logs;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON audit_logs;

-- Policy: Only Admins or Creators can SELECT
CREATE POLICY "Allow view access for Admins and Creators"
ON audit_logs FOR SELECT
TO authenticated
USING (
  get_my_role() IN ('admin', 'creator')
);

-- Policy: Anyone can INSERT
CREATE POLICY "Allow insert for authenticated users"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
