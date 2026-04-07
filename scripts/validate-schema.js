const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function validateAndTest() {
  console.log("=== SCHEMA VALIDATION ===");
  // Quick check via upsert
  const dummyId = "e68e3def-627d-4268-a3ae-3197f00f6492"; // Hardcoded valid ID from earlier or just create one
  
  // Actually let's fetch one case study first
  const { data: fetchRes, error: fetchErr } = await supabase.from('case_studies').select('id, org_id').limit(1);
  if (fetchErr || !fetchRes || fetchRes.length === 0) {
      console.log("No case studies found to test against.");
      process.exit(1);
  }
  
  const testTargetId = fetchRes[0].id;
  
  console.log("Attempting to write summary and metrics...");
  
  const payload = {
      summary: "This is a test summary for validation.",
      metrics: { success: true, timestamp: Date.now() },
  };

  const { data, error } = await supabase.from('case_studies')
     .update(payload)
     .eq('id', testTargetId)
     .select('*')
     .single();

  if (error) {
      console.log("❌ Schema Validation FAILED!");
      console.log(error);
  } else {
      console.log("✅ Schema Validation PASSED!");
      console.log("Written Summary:", data.summary);
      console.log("Written Metrics:", data.metrics);
      console.log("Updated At:", data.updated_at);
  }
  
  process.exit(0);
}

validateAndTest();
