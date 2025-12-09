-- Script to update 'sales' table to match Application Schema

-- 1. Add missing columns expected by NewSaleModal
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS pp text,
ADD COLUMN IF NOT EXISTS plan_sold text,
ADD COLUMN IF NOT EXISTS os_madre text,
ADD COLUMN IF NOT EXISTS os_hija text,
ADD COLUMN IF NOT EXISTS contact_number text,
ADD COLUMN IF NOT EXISTS id_document text;

-- 2. Modify existing columns if necessary (optional, ensuring types)
-- Ensure customer_name is text
ALTER TABLE public.sales ALTER COLUMN customer_name TYPE text;

-- 3. Comments for documentation (optional)
COMMENT ON COLUMN public.sales.pp IS 'Price Point / Plan Code (e.g. CLVD0100)';
COMMENT ON COLUMN public.sales.plan_sold IS 'Name of the plan sold';
