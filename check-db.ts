import { supabaseAdmin } from "./src/lib/supabase-admin";

async function checkFunctions() {
  const { data, error } = await supabaseAdmin.rpc('get_function_signature', { func_name: 'create_interview_safe' });
  
  if (error) {
    console.log("Could not find get_function_signature, trying raw query...");
    const { data: rawData, error: rawError } = await supabaseAdmin.from('pg_proc').select('*').filter('proname', 'eq', 'create_interview_safe');
    console.log("Raw query result:", rawData || rawError);
    return;
  }
  
  console.log("Function signature:", data);
}

checkFunctions();
