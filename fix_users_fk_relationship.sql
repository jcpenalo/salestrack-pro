-- FIX: Re-point Foreign Keys to public.users (Profiles) instead of auth.users
-- The app queries 'users' (public.users) to get full_name, so the Foreign Keys must point there.

-- 1. Drop existing wrong constraints (pointing to auth.users)
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_assigned_to_fkey; -- Might exist auto-generated
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_updated_by_fkey; -- Might exist auto-generated
-- Also drop by column-default names just in case
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_assigned_to_users_fkey; 
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_updated_by_users_fkey;


-- 2. Add Correct Constraints pointing to PUBLIC.USERS
-- User ID (Agent)
ALTER TABLE public.sales 
ADD CONSTRAINT sales_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Assigned To
ALTER TABLE public.sales 
ADD CONSTRAINT sales_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.users(id);

-- Status Updated By
ALTER TABLE public.sales 
ADD CONSTRAINT sales_status_updated_by_fkey 
FOREIGN KEY (status_updated_by) REFERENCES public.users(id);

-- Force reload
NOTIFY pgrst, 'reload config';
