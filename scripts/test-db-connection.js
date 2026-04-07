const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
const env = {};
lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1);
    if (error) {
      console.error("Connection failed:", error.message);
    } else {
      console.log("Successfully connected to Supabase!");
      console.log("Data count check:", data);
    }
  } catch (err) {
    console.error("Critical error testing connection:", err.message);
  }
}

testConnection();
