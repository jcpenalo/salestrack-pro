
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function createTable() {
    try {
        await client.connect();

        console.log('Creating sales table...');

        const query = `
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
        status_id UUID REFERENCES statuses(id) ON DELETE SET NULL,
        sale_date DATE NOT NULL,
        customer_name TEXT,
        
        -- New Fields
        conteo INTEGER,
        contact_number TEXT,
        id_document TEXT, -- Cedula
        os_madre TEXT,
        os_hija TEXT,
        plan_sold TEXT, -- Snapshot of product plan
        pp DECIMAL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Seguimiento
        
        -- Comments
        comment_claro TEXT,
        comment_orion TEXT,
        comment_dofu TEXT,
        
        installed_number TEXT,
        
        -- Audit
        status_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        status_updated_at TIMESTAMP WITH TIME ZONE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Index for performance
      CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
      CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
      CREATE INDEX IF NOT EXISTS idx_sales_status_id ON sales(status_id);
    `;

        await client.query(query);

        // Enable RLS
        await client.query(`ALTER TABLE sales ENABLE ROW LEVEL SECURITY;`);

        // Basic Policy: Check if exists to avoid error
        // Note: Creating policies via raw SQL can fail if they exist. 
        // We will attempt to drop and recreate for clarity or ignore if exists.
        // For now, let's just create table. Policies logic is complex SQL usually.

        console.log('✅ Sales table created successfully.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await client.end();
    }
}

createTable();
