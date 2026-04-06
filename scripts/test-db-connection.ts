import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(".env.local not found at", envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  content.split("\n").forEach(line => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length > 0) {
      env[key.trim()] = rest.join("=").trim().replace(/^["'](.*)["']$/, '$1');
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseServiceRoleKey = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

async function verifyConnection() {
  console.log("--- Supabase Connection Diagnostic ---");
  console.log("Endpoint:", supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // 1. Basic Health Check (Table existence)
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .limit(1);

  if (orgError) {
    console.error("❌ Connection failed:", orgError.message);
    return;
  }
  
  console.log("✅ Connection: SUCCESS");
  console.log("📂 Database: ACCESSIBLE");

  // 2. Critical Function Check
  console.log("\n--- Checking Critical Functions ---");
  const functionsToCheck = ['create_interview_safe', 'log_deal_event'];
  
  for (const fn of functionsToCheck) {
    let hasFunction = false;
    try {
      const { data: procData } = await supabase.from('pg_proc').select('proname').filter('proname', 'eq', fn);
      if (procData && procData.length > 0) hasFunction = true;
    } catch (e) {
      // Ignored
    }
    
    if (hasFunction) {
      console.log(`✅ Function [${fn}]: EXISTS`);
    } else {
      console.log(`⚠️  Function [${fn}]: MISSING! (This is likely required for logic)`);
    }
  }

  // 3. Data Integrity Check
  console.log("\n--- Data Insights ---");
  const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
  const { count: dealCount } = await supabase.from('deals').select('*', { count: 'exact', head: true });
  const { count: interviewCount } = await supabase.from('interviews').select('*', { count: 'exact', head: true });

  console.log(`- Organizations: ${orgCount || 0}`);
  console.log(`- Deals: ${dealCount || 0}`);
  console.log(`- Interviews: ${interviewCount || 0}`);
}

verifyConnection();
