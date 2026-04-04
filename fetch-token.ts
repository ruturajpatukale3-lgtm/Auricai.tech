import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkToken() {
  const { data, error } = await supabase
    .from("interviews")
    .select("token")
    .limit(1);

  if (error) {
    console.error("DB ERROR FOR INTERVIEWS TABLE:", error);
  } else if (data && data.length > 0) {
    console.log("DB TEST SUCCESS. FOUND TOKEN:", data[0].token);
  } else {
    console.log("DB TEST: NO INTERVIEWS RECORD FOUND.");
  }
}

checkToken();
