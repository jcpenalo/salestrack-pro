-- Check RLS status for all relevant tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('users', 'campaigns', 'products', 'statuses', 'concepts', 'goals', 'sales');
