import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env: Record<string, string> = {};
envContent.split("\n").forEach(line => {
  const [key, ...value] = line.split("=");
  if (key && value) env[key.trim()] = value.join("=").trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

async function audit() {
  console.log("--- SECTION 1: BASELINE CHECK ---");
  const { data: subs, error: subError } = await supabase
    .from("subscriptions")
    .select("org_id, interviews_used, interviews_limit, plan_name")
    .limit(1)
    .single();

  if (subError) throw subError;
  const orgId = subs.org_id;
  console.log(`Org ID: ${orgId}`);
  console.log(`Current Usage: ${subs.interviews_used} / ${subs.interviews_limit}`);
  console.log(`Plan: ${subs.plan_name}`);

  const baselineUsed = subs.interviews_used;

  console.log("\n--- SECTION 2: CREATE EVENT TEST ---");
  // Simulate create_interview_safe
  const testToken = `audit-${Date.now()}`;
  const start = Date.now();
  
  const { data: result, error: rpcError } = await supabase.rpc("create_interview_safe", {
    p_org_id: orgId,
    p_client_email: "audit@test.com",
    p_client_name: "Audit User",
    p_token: testToken,
    p_idempotency_key: `audit-key-${Date.now()}`
  });

  const end = Date.now();
  if (rpcError) throw rpcError;
  
  console.log(`RPC call took ${end - start}ms`);
  console.log(`Success: ${result.success}`);

  // Fetch updated usage immediately
  const { data: updatedSub } = await supabase
    .from("subscriptions")
    .select("interviews_used")
    .eq("org_id", orgId)
    .single();

  console.log(`New Usage: ${updatedSub?.interviews_used}`);
  if (updatedSub?.interviews_used === baselineUsed + 1) {
    console.log("✅ Usage incremented accurately.");
  } else {
    console.error("❌ Usage increment mismatch!");
  }

  console.log("\n--- SECTION 4: MULTI-ACTION TEST (RAPID) ---");
  const p1 = supabase.rpc("create_interview_safe", {
    p_org_id: orgId, p_client_email: "audit2@test.com", p_client_name: "Audit User 2",
    p_token: `audit-2-${Date.now()}`, p_idempotency_key: `key-2-${Date.now()}`
  });
  const p2 = supabase.rpc("create_interview_safe", {
    p_org_id: orgId, p_client_email: "audit3@test.com", p_client_name: "Audit User 3",
    p_token: `audit-3-${Date.now()}`, p_idempotency_key: `key-3-${Date.now()}`
  });

  const [res1, res2] = await Promise.all([p1, p2]);
  console.log(`Rapid 1: ${res1.data.success}, Rapid 2: ${res2.data.success}`);

  const { data: finalSub } = await supabase
    .from("subscriptions")
    .select("interviews_used")
    .eq("org_id", orgId)
    .single();

  console.log(`Final Usage: ${finalSub?.interviews_used}`);
  if (finalSub?.interviews_used === baselineUsed + 3) {
    console.log("✅ Multi-action increment verified.");
  } else {
    console.error("❌ Multi-action mismatch!");
  }

  console.log("\n--- SECTION 9: DATA SOURCE VALIDATION ---");
  const { data: auditLog } = await supabase
    .from("usage_audit_logs")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(3);

  console.log(`Audit logs found: ${auditLog?.length}`);
  auditLog?.forEach(log => {
      console.log(`- ${log.event_type} at ${log.created_at}`);
  });

  console.log("\n--- SECTION 6: LIMIT ENFORCEMENT ---");
  // Temporarily set limit to current + 1
  const targetLimit = finalSub?.interviews_used;
  await supabase.from("subscriptions").update({ interviews_limit: targetLimit }).eq("org_id", orgId);
  
  console.log(`Limit set to ${targetLimit}. Attempting one more send...`);
  const { data: limitRes } = await supabase.rpc("create_interview_safe", {
    p_org_id: orgId, p_client_email: "limit@test.com", p_client_name: "Limit User",
    p_token: `limit-${Date.now()}`, p_idempotency_key: `limit-key-${Date.now()}`
  });

  console.log(`Limit Response Success: ${limitRes.success}`);
  if (!limitRes.success && limitRes.error === "LIMIT_REACHED") {
    console.log("✅ Limit enforcement BLOCKED extra usage.");
  } else {
    console.error("❌ Limit enforcement FAILED!");
  }

  // Restore baseline
  await supabase.from("subscriptions").update({ interviews_limit: subs.interviews_limit }).eq("org_id", orgId);
  console.log("\nAudit Done.");
}

audit().catch(console.error);
