import { createClient } from "@supabase/supabase-js";

async function smokeTest() {
  console.log("🚀 Testing Supabase Connection...");
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("URL configured:", url ? "Yes" : "No", url ? `(ends with ${url.slice(-5)})` : "");
  console.log("Key configured:", key ? "Yes" : "No", key ? `(starts with ${key.slice(0, 5)})` : "");

  if (!url || !key) {
    console.error("❌ Missing env variables");
    return;
  }

  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("count", { count: 'exact', head: true });

    if (error) {
      console.error("❌ Request returned a Supabase error:");
      console.dir(error, { depth: null });
      return;
    }

    console.log("✅ Successfully connected to 'organizations' table.");
  } catch (err) {
    console.error("❌ Unexpected fetch error caught:");
    console.dir(err, { depth: null });
  }
}

smokeTest();
