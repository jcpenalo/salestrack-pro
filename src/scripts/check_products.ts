
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProducts() {
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('active', true);

    if (error) {
        console.error(error);
        return;
    }

    const counts: { [key: string]: number } = {};
    products.forEach((p: any) => {
        counts[p.name] = (counts[p.name] || 0) + 1;
    });

    console.log("Duplicate Check:");
    Object.entries(counts).forEach(([name, count]) => {
        if (count > 1) {
            console.log(`${name}: ${count} times`);
            // List IDs
            const ids = products.filter((p: any) => p.name === name).map((p: any) => p.id);
            console.log(`   IDs: ${ids.join(', ')}`);
        }
    });
}

checkProducts();
