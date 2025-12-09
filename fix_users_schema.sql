-- Add role column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN 
        ALTER TABLE users ADD COLUMN role text DEFAULT 'agent'; 
    END IF; 
END $$;

-- Add supervisor_id column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'supervisor_id') THEN 
        ALTER TABLE users ADD COLUMN supervisor_id uuid REFERENCES users(id); 
    END IF; 
END $$;

-- Create an index for supervisor_id for better performance
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);

-- Update RLS to allow supervisors to read their agents? (Optional, staying with basic policies for now)
-- Ensure 'role' is accessible
-- (Assuming existing policies allow public read or auth read)
