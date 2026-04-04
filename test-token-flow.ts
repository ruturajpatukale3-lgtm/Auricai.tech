import { register } from "tsconfig-paths";
import tsConfig from "./tsconfig.json";

register({
  baseUrl: "./",
  paths: tsConfig.compilerOptions.paths,
});

import "./src/lib/supabase-admin";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nanoid } from "nanoid";

async function traceTokenFlow() {
  const email = "trace@example.com";
  
  // Create a base org
  const org = await OrganizationRepository.create({ name: "Trace Org", plan_type: "free" });
  console.log("----------------------------------");
  console.log("SETUP: TRACE ORG CREATED");
  console.log("----------------------------------");

  console.log("----------------------------------");
  console.log("STEP 1: TOKEN CREATION");
  console.log("----------------------------------");
  const token = nanoid(24);
  console.log("STEP 1 - TOKEN CREATED:", token);
  console.log("Token length:", token.length);
  
  console.log("----------------------------------");
  console.log("STEP 2: DATABASE INSERT");
  console.log("----------------------------------");
  const { data: insertedRecord, error: insertError } = await supabaseAdmin
  .from("interviews")
  .insert({
    org_id: org.id,
    client_email: email,
    token: token,
    status: "sent",
  })
  .select()
  .single();

  if (insertError) {
     console.error("INSERT ERROR", insertError);
  } else {
     console.log("STEP 2 - INSERT SUCCESS:", insertedRecord.id);
  }

  const { data: queriedToken } = await supabaseAdmin.from("interviews").select("token").eq("token", token).single();
  console.log("QUERIED DB EXACT TOKEN:", queriedToken?.token);
  console.log("MATCHES:", queriedToken?.token === token);

  console.log("----------------------------------");
  console.log("STEP 3: LINK GENERATION");
  console.log("----------------------------------");
  const url = `http://localhost:3000/interview/${token}`;
  console.log("STEP 3 - LINK:", url);

  console.log("----------------------------------");
  console.log("STEP 4: PUBLIC API ENTRY");
  console.log("----------------------------------");
  const extractedToken = url.split('/').pop();
  console.log("STEP 4 - TOKEN EXTRACTED FROM URL:", extractedToken);
  console.log("MATCHES:", extractedToken === token);

  console.log("----------------------------------");
  console.log("STEP 5: DATABASE QUERY");
  console.log("----------------------------------");
  const interview = await InterviewService.getByToken(token);
  console.log("STEP 5 - QUERY RESULT EXISTS:", !!interview);
  if (interview) console.log("STEP 5 - NATIVE DB FETCH WORKS");

  console.log("----------------------------------");
  console.log("STEP 6 & 7 & 8: DIAGNOSTICS");
  console.log("----------------------------------");
  if (!interview) {
    console.log("FAIL: Interview is null. Let's trace why.");
    // Manual query without join
    const { data: rawLookup } = await supabaseAdmin.from("interviews").select("*").eq("token", token).single();
    console.log("Raw Lookup works?:", !!rawLookup);

    // Let's check expiration logic separately
    if (rawLookup) {
       const createdDate = new Date(rawLookup.created_at);
       const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
       console.log("EXPIRY CHECK:", createdDate < thirtyDaysAgo);
    }
  } else {
    console.log("SUCCESS: getByToken returned the interview natively.");
  }
}

traceTokenFlow();
