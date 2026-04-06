import { supabaseAdmin } from "./src/lib/supabase-admin";

async function testConnection() {
  console.log("Testing connection to Supabase...");
  const { data, error } = await supabaseAdmin.from('org_profile').select('*').limit(1);
  
  if (error) {
    console.error("Connection failed:", error.message);
  } else {
    console.log("Connection successful! Fetched data:", data);
  }
}

testConnection();
