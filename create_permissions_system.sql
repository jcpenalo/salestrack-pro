-- Dynamic Permissions System (Re-runnable)
-- Maps User Roles (Human Name) -> DB Enum (Internal Name)
-- Creador -> creator
-- Admin -> admin
-- Gerente -> gerente (NEW)
-- Senior Supervisor -> senior
-- Supervisor -> supervisor
-- Auditor -> auditor
-- Seguimiento -> seguimiento
-- Digitacion -> digitacion (NEW)
-- Representante -> representative

-- 1. SCHEMA SETUP
CREATE TABLE IF NOT EXISTS public.app_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    role text NOT NULL,
    resource_key text NOT NULL,
    is_allowed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(role, resource_key)
);

-- RLS
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;

-- Read: Authenticated users view permissions
DROP POLICY IF EXISTS "Read permissions" ON public.app_permissions;
CREATE POLICY "Read permissions" ON public.app_permissions FOR SELECT TO authenticated USING (true);

-- Write: Only Creador and Admin can manage
DROP POLICY IF EXISTS "Manage permissions" ON public.app_permissions;
CREATE POLICY "Manage permissions" ON public.app_permissions USING (
    (SELECT role::text FROM public.users WHERE id = auth.uid()) IN ('creator', 'admin')
) WITH CHECK (
    (SELECT role::text FROM public.users WHERE id = auth.uid()) IN ('creator', 'admin')
    AND role <> 'creator' 
);


-- 2. CLEANUP & SEED
TRUNCATE TABLE public.app_permissions;

-- 2. SEED PERMISSIONS
CREATE OR REPLACE FUNCTION seed_permission(p_role text, p_key text, p_allowed boolean) RETURNS void AS $$
BEGIN
    INSERT INTO public.app_permissions (role, resource_key, is_allowed)
    VALUES (p_role, p_key, p_allowed)
    ON CONFLICT (role, resource_key) DO UPDATE SET is_allowed = p_allowed;
END;
$$ LANGUAGE plpgsql;

-- === 1. FIELD EDITING (Sales Table) ===

-- 'Assigned To'
-- Creador, Admin, Gerente, Senior Supervisor, Supervisor
SELECT seed_permission('creator', 'field:sales.assigned_to', true);
SELECT seed_permission('admin', 'field:sales.assigned_to', true);
SELECT seed_permission('gerente', 'field:sales.assigned_to', true);
SELECT seed_permission('senior', 'field:sales.assigned_to', true);
SELECT seed_permission('supervisor', 'field:sales.assigned_to', true);

-- 'Status'
-- All except Representative (representative)
DO $$ DECLARE r text; BEGIN
    FOREACH r IN ARRAY ARRAY['creator', 'admin', 'gerente', 'senior', 'supervisor', 'auditor', 'seguimiento', 'digitacion'] LOOP
        PERFORM seed_permission(r, 'field:sales.status_id', true);
    END LOOP;
END $$;
-- representative is excluded

-- 'Comments' & 'Installed Num'
-- Admin, Senior, Supervisor, Seguimiento, Digitacion
DO $$ DECLARE r text; BEGIN
    FOREACH r IN ARRAY ARRAY['creator', 'admin', 'senior', 'supervisor', 'seguimiento', 'digitacion'] LOOP
        PERFORM seed_permission(r, 'field:sales.comment_claro', true);
        PERFORM seed_permission(r, 'field:sales.comment_orion', true);
        PERFORM seed_permission(r, 'field:sales.comment_dofu', true);
        PERFORM seed_permission(r, 'field:sales.installed_number', true);
    END LOOP;
END $$;

-- 'Core Data' (Campaign, Contact, OS)
-- Senior, Supervisor, Seguimiento, Digitacion
DO $$ DECLARE r text; BEGIN
    FOREACH r IN ARRAY ARRAY['creator', 'senior', 'supervisor', 'seguimiento', 'digitacion'] LOOP
        PERFORM seed_permission(r, 'field:sales.campaign_id', true);
        PERFORM seed_permission(r, 'field:sales.contact_number', true);
        PERFORM seed_permission(r, 'field:sales.os_madre', true);
        PERFORM seed_permission(r, 'field:sales.os_hija', true);
    END LOOP;
END $$;


-- === 2. TABS (Sidebar Visibility) ===

-- Dashboard Admin / Config (Only Creador/Admin)
SELECT seed_permission('creator', 'tab:admin_dashboard', true);
SELECT seed_permission('admin', 'tab:admin_dashboard', true);
SELECT seed_permission('creator', 'tab:config', true);
SELECT seed_permission('admin', 'tab:config', true);

-- Sales Tab (Everyone)
DO $$ DECLARE r text; BEGIN
    FOREACH r IN ARRAY ARRAY['creator', 'admin', 'gerente', 'senior', 'supervisor', 'auditor', 'seguimiento', 'digitacion', 'representative'] LOOP
        PERFORM seed_permission(r, 'tab:sales', true);
    END LOOP;
END $$;


DROP FUNCTION seed_permission;
NOTIFY pgrst, 'reload config';
