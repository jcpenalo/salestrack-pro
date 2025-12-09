-- Create Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id), -- Tracks which agent made the sale
    campaign_id UUID REFERENCES campaigns(id),
    product_id UUID REFERENCES products(id),
    concept_id UUID REFERENCES concepts(id),
    status_id UUID REFERENCES statuses(id),
    assigned_to UUID REFERENCES users(id), -- For "Seguimiento" (Public profile ID)
    
    sale_date DATE NOT NULL,
    customer_name TEXT,
    contact_number TEXT,     -- "Num contacto"
    id_document TEXT,        -- "Cédula"
    conteo INTEGER,          -- "Conteo"
    
    -- Operational Data
    os_madre TEXT,           -- "OS Madre"
    os_hija TEXT,            -- "OS Hija"
    plan_sold TEXT,          -- "Plan Vendido"
    pp DECIMAL,              -- "PP"
    installed_number TEXT,   -- "Numero Instalado"
    
    -- Comments
    comment_claro TEXT,
    comment_orion TEXT,
    comment_dofu TEXT,
    
    -- Audit / Meta
    status_updated_by UUID REFERENCES users(id),
    status_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status_id ON sales(status_id);
CREATE INDEX IF NOT EXISTS idx_sales_campaign_id ON sales(campaign_id);

-- Policies (Basic Placeholder - Admins/Creators can do all, Agents can view/insert own)
-- Note: You may need to run these separately if policies already exist.

CREATE POLICY "Admins have full access to sales" 
ON sales FOR ALL 
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'creator', 'gerente'))
);

CREATE POLICY "Agents can insert their own sales" 
ON sales FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Agents can view their own sales" 
ON sales FOR SELECT 
USING (
  auth.uid() = user_id
);
