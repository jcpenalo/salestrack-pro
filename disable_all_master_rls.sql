-- GLOBAL UNLOCK: Disable RLS on all Master Data tables
-- This is a diagnostic measure to explicitly rule out Permission/Policy Locks.

-- 1. Concepts (Already done, but ensuring)
ALTER TABLE public.concepts DISABLE ROW LEVEL SECURITY;

-- 2. Products
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- 3. Campaigns
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;

-- 4. Statuses
ALTER TABLE public.statuses DISABLE ROW LEVEL SECURITY;

-- 5. Goals
ALTER TABLE public.goals DISABLE ROW LEVEL SECURITY;

-- 6. Grant full access to authenticated users (just in case)
GRANT ALL ON public.concepts TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.campaigns TO authenticated;
GRANT ALL ON public.statuses TO authenticated;
GRANT ALL ON public.goals TO authenticated;
