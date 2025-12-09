-- FIX: Add Missing Foreign Key Constraints to 'sales' table
-- The error "Could not find a relationship" means these constraints are missing.

-- 1. Product Relationship
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_product_id_fkey;
ALTER TABLE public.sales
ADD CONSTRAINT sales_product_id_fkey
FOREIGN KEY (product_id) REFERENCES public.products(id);

-- 2. Campaign Relationship
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_campaign_id_fkey;
ALTER TABLE public.sales
ADD CONSTRAINT sales_campaign_id_fkey
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);

-- 3. Concept Relationship
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_concept_id_fkey;
ALTER TABLE public.sales
ADD CONSTRAINT sales_concept_id_fkey
FOREIGN KEY (concept_id) REFERENCES public.concepts(id);

-- 4. Status Relationship
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_status_id_fkey;
ALTER TABLE public.sales
ADD CONSTRAINT sales_status_id_fkey
FOREIGN KEY (status_id) REFERENCES public.statuses(id);

-- 5. User Relationships (already tried, but enforcing again to be safe)
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE public.sales
ADD CONSTRAINT sales_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
