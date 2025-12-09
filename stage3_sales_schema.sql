-- STAGE 3: Sales Operations Table
-- Connecting all pieces together. No RLS policies for now to prioritize speed.

CREATE TABLE public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Foreign Keys
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Agent
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
    status_id UUID REFERENCES public.statuses(id) ON DELETE SET NULL,

    -- Transaction Details
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Customer Info
    customer_code TEXT, -- DNI/RUT/CEDULA
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    
    -- Metadata
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX sales_user_id_idx ON public.sales(user_id);
CREATE INDEX sales_status_id_idx ON public.sales(status_id);
CREATE INDEX sales_sale_date_idx ON public.sales(sale_date);
CREATE INDEX sales_customer_code_idx ON public.sales(customer_code);

-- Disable RLS explicitly as requested
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
