-- 1. Create exit_reasons table
CREATE TABLE IF NOT EXISTS exit_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Insert default values
INSERT INTO exit_reasons (reason) VALUES 
('Mejor oportunidad de empleo'),
('Razones de estudios'),
('Bajo desempeño'),
('Problemas personales'),
('Mudanza'),
('Otro')
ON CONFLICT DO NOTHING; -- No conflict clause needed for ID usually, but good practice if we had unique keys

-- 3. Expand users table
-- We use DO blocks to avoid errors if columns exist
DO $$ 
BEGIN 
    -- vicidial_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'vicidial_id') THEN 
        ALTER TABLE users ADD COLUMN vicidial_id TEXT; 
    END IF;

    -- card_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'card_number') THEN 
        ALTER TABLE users ADD COLUMN card_number TEXT; 
    END IF;

    -- entry_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'entry_date') THEN 
        ALTER TABLE users ADD COLUMN entry_date DATE; 
    END IF;

    -- exit_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'exit_date') THEN 
        ALTER TABLE users ADD COLUMN exit_date DATE; 
    END IF;

    -- status (active, inactive) - Default to 'active'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN 
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'; 
    END IF;

    -- exit_reason_id (FK)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'exit_reason_id') THEN 
        ALTER TABLE users ADD COLUMN exit_reason_id UUID REFERENCES exit_reasons(id); 
    END IF;
END $$;
