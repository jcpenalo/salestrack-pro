-- Check table definition
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'concepts';

-- Check RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'concepts';

-- Check Data Count
SELECT 
    count(*) as total_concepts,
    count(*) filter (where active = true) as active_concepts
FROM concepts;

-- Sample Data
SELECT * FROM concepts LIMIT 5;
