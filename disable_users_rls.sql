-- Disable RLS on users table to rule out ANY permission lock
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
