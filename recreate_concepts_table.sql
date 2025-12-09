-- Recreate Concepts table to ensure clean state
-- WARNING: This will delete existing concepts data.

DROP TABLE IF EXISTS public.concepts CASCADE;

-- Ensure constraints/types exist
DO $$ BEGIN
    CREATE TYPE public.concept_type AS ENUM ('sale', 'rejection', 'cancellation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE public.concepts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type public.concept_type NOT NULL DEFAULT 'sale',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

-- Add a simple, robust policy causing NO recursion
CREATE POLICY "Allow all authenticated" ON public.concepts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant access to authenticated users
GRANT ALL ON public.concepts TO authenticated;
GRANT ALL ON public.concepts TO service_role;
