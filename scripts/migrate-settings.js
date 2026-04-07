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

async function runMigration() {
  console.log('═══ RUNNING MIGRATION FOR SETTINGS UPGRADE ═══\n');

  // Since we cannot run raw SQL via .rpc('exec_sql') unless it exists, 
  // we will attempt to add columns using a series of queries or an RPC if available.
  // Standard Supabase doesn't allow ALTER TABLE via JS client easily.
  // We'll use the 'supabaseAdmin' pattern which is usually a Wrapper for Postgres.
  
  console.log('Please execute the following SQL in your Supabase SQL Editor:\n');
  const sql = `
-- 1. Upgrade org_profile
ALTER TABLE public.org_profile 
ADD COLUMN IF NOT EXISTS ai_tone text DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS ai_output_style text DEFAULT 'detailed',
ADD COLUMN IF NOT EXISTS ai_case_study_style text DEFAULT 'story_driven',
ADD COLUMN IF NOT EXISTS font_preset text DEFAULT 'sans';

-- 2. Upgrade team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS disabled_at timestamptz DEFAULT NULL;
  `;
  console.log(sql);

  // We can try to use a dummy update to see if columns exist
  const { error } = await supabase.from('org_profile').select('ai_tone').limit(1);
  if (error && error.message.includes('column "ai_tone" does not exist')) {
    console.log('❌ Columns NOT found. Action required: Run the SQL above in Supabase dashboard.');
  } else {
    console.log('✅ Columns found or already exist.');
  }
}

runMigration().catch(console.error);
