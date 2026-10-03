const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hkmckranacbsqtlouwir.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbWNrcmFuYWNic3F0bG91d2lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTAyNTU4OCwiZXhwIjoyMTA2NjAxNTg4fQ.8MW08oBo-Gawoo7j3O6mS-XpTcFvHxDBZr-XW6_BH9k';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function parseDateString(s) {
  if (!s) return null;
  const str = String(s).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    let [m, d, y] = parts;
    if (y.length === 2) y = '20' + y;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
}

async function runSeed() {
  console.log('Connecting to Supabase at:', SUPABASE_URL);

  // Check if customers table is accessible
  const { error: testErr } = await supabase.from('customers').select('id').limit(1);
  if (testErr) {
    console.error('\n⚠️ Could not access public.customers table.');
    console.error('Error:', testErr.message);
    console.error('\nPlease run the SQL in supabase/schema.sql in your Supabase SQL Editor first:');
    console.error('👉 https://supabase.com/dashboard/project/hkmckranacbsqtlouwir/sql/new');
    process.exit(1);
  }

  console.log('✓ Tables verified! Reading public/TOI_RECORDS.xlsx...');
  const fileBuffer = fs.readFileSync(path.join(__dirname, '../public/TOI_RECORDS.xlsx'));
  const wb = xlsx.read(fileBuffer, { type: 'buffer', raw: false });
  const sheet = wb.Sheets['Customers'];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { raw: false });

  console.log(`Found ${rawRows.length} rows to seed.`);

  let insertedCount = 0;
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const serialNo = r['Serial Number'] || (i + 1);
    const rawCustIdNotes = (r['Customer ID/Notes'] || '').trim();

    let customerId = '';
    const idMatch = rawCustIdNotes.match(/\b\d{6,10}\b/);
    if (idMatch) {
      customerId = idMatch[0];
    } else {
      customerId = `TOI-${String(serialNo).padStart(4, '0')}`;
    }

    const customerName = (r['Customer Name'] || 'Unknown').trim();
    const address = (r['Customer Address'] || '').trim();
    const mobileNumber = (r['Phone Number'] || '').trim();
    const orderId = (r['Order ID'] || '').trim();
    const startDate = parseDateString(r['Start Date']) || '2025-01-01';
    const endDate = parseDateString(r['End Date']) || '2026-12-31';

    // Insert or Upsert customer
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .upsert({
        customer_id: customerId,
        customer_name: customerName,
        address,
        mobile_number: mobileNumber,
        order_id: orderId,
      }, { onConflict: 'customer_id' })
      .select('id')
      .single();

    if (custErr) {
      console.error(`Error inserting customer ${customerId}:`, custErr.message);
      continue;
    }

    // Insert or update subscription
    const { error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        customer_id: customer.id,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        is_current: true,
      });

    if (subErr) {
      console.error(`Error inserting subscription for ${customerId}:`, subErr.message);
    } else {
      insertedCount++;
    }

    if ((i + 1) % 50 === 0 || i === rawRows.length - 1) {
      console.log(`Progress: ${i + 1}/${rawRows.length} records processed...`);
    }
  }

  console.log(`\n🎉 Seed completed! ${insertedCount}/${rawRows.length} customers and subscriptions populated in Supabase.`);
}

runSeed().catch(console.error);
