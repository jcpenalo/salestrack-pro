-- FIX: Add missing roles to the Database Enum
-- User requested: Gerente, Digitacion

-- Postgres does not support adding multiple values in one command, so we do them one by one inside a block to ignore if they verify exist.

DO $$
BEGIN
    -- Add 'gerente'
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gerente') THEN
        ALTER TYPE public.user_role ADD VALUE 'gerente';
    END IF;

    -- Add 'digitacion'
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'digitacion') THEN
        ALTER TYPE public.user_role ADD VALUE 'digitacion';
    END IF;
END $$;
