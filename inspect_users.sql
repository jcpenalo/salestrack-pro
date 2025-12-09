-- Check users table structure and data sample to identify agent role
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';

SELECT * FROM public.users LIMIT 5;
