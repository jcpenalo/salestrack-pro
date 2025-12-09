-- Secure RLS policies for Statuses and Goals to prevent infinite recursion

-- Ensure helper function exists (it should, but good practice)
CREATE OR REPLACE FUNCTION public.get_user_role_safe()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$;

-- 1. Policies for STATUSES
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.statuses;
DROP POLICY IF EXISTS "Enable write access for creators and admins" ON public.statuses;

CREATE POLICY "Enable read access for all users" ON public.statuses
  FOR SELECT USING (true);

CREATE POLICY "Enable write access for creators and admins" ON public.statuses
  FOR ALL
  USING (
    public.get_user_role_safe() IN ('admin', 'creator')
  );

-- 2. Policies for GOALS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.goals;
DROP POLICY IF EXISTS "Enable write access for creators and admins" ON public.goals;

CREATE POLICY "Enable read access for all users" ON public.goals
  FOR SELECT USING (true);

CREATE POLICY "Enable write access for creators and admins" ON public.goals
  FOR ALL
  USING (
    public.get_user_role_safe() IN ('admin', 'creator')
  );
