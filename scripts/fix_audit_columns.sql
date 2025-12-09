-- Add Audit Columns if they don't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES users(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- Fix Foreign Key Name to match the code (sales_status_updated_by_fkey)
-- First, try to remove any existing generic FK on this column to avoid duplicates
-- (This part is tricky in raw SQL without knowing the name, but we can just ADD the named one)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_status_updated_by_fkey'
    ) THEN
        ALTER TABLE sales ADD CONSTRAINT sales_status_updated_by_fkey 
        FOREIGN KEY (status_updated_by) REFERENCES users(id);
    END IF;
END $$;
