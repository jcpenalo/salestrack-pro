-- List all triggers in the database to identify potential blockers
SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_statement as definition,
    action_timing as timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY table_name, event;
