-- Check constraints on goals
SELECT conname, contype, CASE WHEN pg_get_constraintdef(c.oid) LIKE '%products%' THEN 'products' ELSE 'users' END as ref_table
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'goals';

-- Check active users for dropdown
SELECT count(*) as active_users FROM users WHERE active = true;

-- Check active products for dropdown
SELECT count(*) as active_products FROM products WHERE active = true;
