-- FIX: Enable Read Access for ALL Master Data Tables
-- The 'Sales' table was blank because the user couldn't "see" the related Products/Campaigns due to missing policies.

-- 1. Campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.campaigns;
CREATE POLICY "Enable read access for all users" ON public.campaigns FOR SELECT USING (true);

-- 2. Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
CREATE POLICY "Enable read access for all users" ON public.products FOR SELECT USING (true);

-- 3. Concepts
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.concepts;
CREATE POLICY "Enable read access for all users" ON public.concepts FOR SELECT USING (true);

-- 4. Statuses
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.statuses;
CREATE POLICY "Enable read access for all users" ON public.statuses FOR SELECT USING (true);

-- 5. Users (Agents) - Critical for "Assigned To" / "Agent" columns
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
CREATE POLICY "Enable read access for authenticated users" ON public.users FOR SELECT TO authenticated USING (true);
