-- Add remaining missing columns and Foreign Keys to 'sales' table

-- 1. Add Reference Columns (Foreign Keys)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status_updated_by uuid REFERENCES auth.users(id);

-- 2. Add Tracking/Comment Columns
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS comment_claro text,
ADD COLUMN IF NOT EXISTS comment_orion text,
ADD COLUMN IF NOT EXISTS comment_dofu text,
ADD COLUMN IF NOT EXISTS installed_number text;

-- 3. Add Timestamps (if missing)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

-- 4. Explicitly define Foreign Key names if needed for Supabase relationships
-- (Usually automatic, but good to ensure)
-- Note: Supabase PostgREST finds relationships by FK constraint.
-- We ensured the references above. 
