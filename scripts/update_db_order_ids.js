const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  });
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hkmckranacbsqtlouwir.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function formatOrderId(orderId) {
  if (!orderId) return '';
  return orderId.replace(/[_\s]+/g, '').trim();
}

async function run() {
  console.log('Connecting to Supabase at:', SUPABASE_URL);

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, customer_name, order_id')
    .limit(2000);

  if (error) {
    console.error('Failed to fetch customers:', error);
    process.exit(1);
  }

  console.log(`Fetched ${customers.length} total customers.`);

  const updates = [];
  for (const c of customers) {
    if (!c.order_id) continue;
    const clean = formatOrderId(c.order_id);
    if (clean !== c.order_id) {
      updates.push({
        id: c.id,
        name: c.customer_name,
        oldOrderId: c.order_id,
        newOrderId: clean,
      });
    }
  }

  console.log(`Found ${updates.length} customers needing order_id update to AnyTextNumber format.`);

  let successCount = 0;
  for (const u of updates) {
    const { error: updateErr } = await supabase
      .from('customers')
      .update({ order_id: u.newOrderId })
      .eq('id', u.id);

    if (updateErr) {
      console.error(`Failed to update customer ${u.name} (${u.id}):`, updateErr.message);
    } else {
      successCount++;
    }
  }

  console.log(`\nSuccessfully updated ${successCount} of ${updates.length} customers in the database!`);

  // Verification step
  console.log('\n--- VERIFICATION ---');
  const { data: verifyData } = await supabase
    .from('customers')
    .select('id, customer_name, order_id')
    .limit(2000);

  const stillUnformatted = verifyData.filter(c => c.order_id && /[_\s]/.test(c.order_id));
  console.log('Remaining order IDs with spaces or underscores:', stillUnformatted.length);

  const formattedOrderIds = verifyData.map(c => c.order_id).filter(Boolean);
  console.log('Total non-empty order IDs in database:', formattedOrderIds.length);
  console.log('Sample updated order IDs in database:', formattedOrderIds.slice(0, 15));
}

run().catch(console.error);
