import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function test() {
  console.log("Connecting to:", supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Check tables
  const { data: tables, error: tableError } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public');

  if (tableError) {
    console.error("Connection failed:", tableError.message);
    process.exit(1);
  }

  console.log("Connected successfully!");
  console.log("Tables found:", tables.map(t => t.tablename).join(", "));
  
  // Check for critical function
  const { data: func, error: funcError } = await supabase.rpc('create_interview_safe', { 
    p_org_id: '00000000-0000-0000-0000-000000000000',
    p_client_name: 'test',
    p_client_email: 'test@example.com'
  });
  
  if (funcError && funcError.code === 'P0001') {
     console.log("Function 'create_interview_safe' exists (returned app error as expected).");
  } else if (funcError && funcError.message.includes("does not exist")) {
     console.log("CRITICAL: Function 'create_interview_safe' is MISSING.");
  } else {
     console.log("Function check status:", funcError?.message || "Success");
  }
}

test();
