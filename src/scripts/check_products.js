
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env roughly
const envPath = path.resolve(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProducts() {
    console.log("Checking products...");
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('active', true);

    if (error) {
        console.error(error);
        return;
    }

    const counts = {};
    products.forEach(p => {
        counts[p.name] = (counts[p.name] || 0) + 1;
    });

    console.log("Duplicate Check Result:");
    let found = false;
    Object.entries(counts).forEach(([name, count]) => {
        if (count > 1) {
            found = true;
            console.log(`[DUPLICATE] ${name}: ${count} times`);
            // List IDs
            const ids = products.filter(p => p.name === name).map(p => p.id);
            console.log(`   IDs: ${ids.join(', ')}`);
        }
    });

    if (!found) {
        console.log("No duplicates found in DB.");
    }
}

checkProducts();
