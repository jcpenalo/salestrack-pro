-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh/clean
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all data" ON public.users;
DROP POLICY IF EXISTS "Service Role can do everything" ON public.users;

-- Policy 1: Users can read their OWN data (Critical for is_active check)
CREATE POLICY "Users can read own data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Admins/Creators can read ALL data
CREATE POLICY "Admins can read all data" 
ON public.users 
FOR ALL 
USING (
  exists (
    select 1 from public.users 
    where id = auth.uid() 
    and role in ('admin', 'creator', 'gerente', 'supervisor', 'auditor') -- Expanded roles for visibility
  )
);

-- Policy 3: Allow insert during signup (if handled by triggers/functions, this might not be needed, but good for safety if using client auth)
-- Ideally creation is done by Service Role which bypasses RLS, so we might skip this if using adminActions.ts

-- Ensure Service Role bypasses (Default behavior, but good to know)
