/**
 * Auricai — Paddle V2 API Verification Script
 * Purpose: Test if Paddle API Key, Price IDs, and Environment are correctly configured.
 * Run with: npx tsx --env-file=.env.local test-paddle-api.ts
 */

import { register } from "tsconfig-paths";
import tsConfig from "./tsconfig.json";

register({
  baseUrl: "./",
  paths: tsConfig.compilerOptions.paths,
});

async function testPaddle() {
  const PADDLE_API_KEY = process.env.PADDLE_API_KEY || "";
  const PADDLE_API_URL = process.env.PADDLE_SANDBOX === "true"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
  
  // Test with Starter Monthly Price ID from .env.local
  const priceId = process.env.PADDLE_STARTER_PRICE_ID || "";

  console.log("🧪 [TEST] Starting Paddle API Verification...");
  console.log(`   - Environment: ${process.env.PADDLE_SANDBOX === "true" ? "SANDBOX" : "PRODUCTION"}`);
  console.log(`   - API URL: ${PADDLE_API_URL}`);
  console.log(`   - Key Presence: ${PADDLE_API_KEY ? "EXISTS" : "MISSING"} (Starts: ${PADDLE_API_KEY.slice(0, 8)}... Ends: ${PADDLE_API_KEY.slice(-4)})`);
  console.log(`   - Starter Price ID: ${priceId}`);

  if (!PADDLE_API_KEY) {
    console.error("❌ [TEST FAILED] PADDLE_API_KEY is missing from .env.local");
    return;
  }

  if (!priceId) {
    console.error("❌ [TEST FAILED] PADDLE_STARTER_PRICE_ID is missing from .env.local");
    return;
  }

  try {
    console.log("\n📡 [1/2] Verifying Price ID exists in Paddle...");
    const priceRes = await fetch(`${PADDLE_API_URL}/prices/${priceId}`, {
      headers: { "Authorization": `Bearer ${PADDLE_API_KEY}` },
    });

    const priceData = await priceRes.json();

    if (!priceRes.ok) {
      console.error("❌ [PRICE VERIFICATION FAILED]:", JSON.stringify(priceData, null, 2));
      console.error("\n💡 HINT: If you get a 404, it means this Price ID does NOT exist in the current Paddle environment (Check Sandbox vs Production).");
      return;
    }

    console.log(`   ✅ Price ID is VALID: ${priceData.data.description || "Active Price"}`);

    console.log("\n📡 [2/2] Attempting to create a Test Transaction (Checkout Link)...");
    const transactionRes = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
      }),
    });

    const transactionData = await transactionRes.json();

    if (!transactionRes.ok) {
      console.error("❌ [TRANSACTION FAILED]:", JSON.stringify(transactionData, null, 2));
      return;
    }

    const checkoutUrl = transactionData.data?.checkout?.url;
    console.log(`   ✅ Transaction Created!`);
    console.log(`   🔗 Generated Checkout URL: ${checkoutUrl || "NOT RETURNED"}`);

    if (checkoutUrl) {
      console.log("\n🎊 [SUCCESS] Your Paddle Backend is 100% correctly configured.");
    } else {
      console.error("❌ [ISSUE] Paddle accepted the transaction but did not return a checkout URL. This usually happens if the Product is not fully configured in Paddle.");
    }

  } catch (e) {
    console.error("❌ [FATAL ERROR] Failed to connect to Paddle API:", (e as Error).message);
  }
}

testPaddle();
