
-- Seed Granular Admin Permissions
-- tab:audit_logs
-- tab:system_monitor

-- Helper function (inline)
DO $$
DECLARE 
    r text;
BEGIN
    -- 1. Audit Logs (Creator, Admin, Gerente, Auditor(maybe?))
    -- Let's give it to Creator, Admin, Auditor for now
    FOREACH r IN ARRAY ARRAY['creator', 'admin', 'auditor'] LOOP
        INSERT INTO public.app_permissions (role, resource_key, is_allowed)
        VALUES (r, 'tab:audit_logs', true)
        ON CONFLICT (role, resource_key) DO UPDATE SET is_allowed = true;
    END LOOP;

    -- 2. System Monitor (Creator, Admin only)
    FOREACH r IN ARRAY ARRAY['creator', 'admin'] LOOP
        INSERT INTO public.app_permissions (role, resource_key, is_allowed)
        VALUES (r, 'tab:system_monitor', true)
        ON CONFLICT (role, resource_key) DO UPDATE SET is_allowed = true;
    END LOOP;

END $$;
