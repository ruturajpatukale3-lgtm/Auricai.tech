import { supabaseAdmin } from "./src/lib/supabase-admin";

async function checkInterviews() {
  console.log("Checking interviews table...");
  const { data, error } = await supabaseAdmin.from('interviews').select('*').limit(1);
  
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("Table exists! Found Data:", data);
  }
}

checkInterviews();
