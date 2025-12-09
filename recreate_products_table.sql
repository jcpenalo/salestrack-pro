-- FIXED SCHEMA for Products
-- This aligns perfectly with the UI form to prevent type mismatches.

DROP TABLE IF EXISTS public.products CASCADE;

CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    family TEXT,
    concept TEXT,   -- Flexible text to match UI
    plans TEXT,     -- Flexible text
    pp TEXT,        -- Changed from Decimal to TEXT to allow 'PP01'
    center_price NUMERIC DEFAULT 0,
    incentive NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX products_name_idx ON public.products(name);

-- DISABLE RLS for this table to prevent locks
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
