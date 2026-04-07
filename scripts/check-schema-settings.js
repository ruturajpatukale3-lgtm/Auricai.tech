const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Env
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').filter(l => !l.startsWith('#')).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function checkSchema() {
  console.log('═══ SCHEMA CHECK FOR SETTINGS UPGRADE ═══\n');

  const tables = ['organizations', 'org_profiles', 'memberships'];
  
  for (const table of tables) {
    console.log(`Checking Table: ${table}`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`- Error or empty: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`- Columns: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`- Empty table.`);
    }
  }

  // Check types if possible
  const { data: roleData } = await supabase.from('memberships').select('role').limit(5);
  console.log('\nExisting Membership Roles:', [...new Set((roleData || []).map(r => r.role))]);
}

checkSchema().catch(console.error);
