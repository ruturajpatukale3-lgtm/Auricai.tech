/**
 * Auricai — Direct Email Verification Script
 * Purpose: Test if Resend API key and domain configuration are valid.
 * Run with: npx tsx --env-file=.env.local test-send-email.ts
 */

import { register } from "tsconfig-paths";
import tsConfig from "./tsconfig.json";

register({
  baseUrl: "./",
  paths: tsConfig.compilerOptions.paths,
});

import { EmailService } from "./src/lib/services/email.service";

async function testEmail() {
  const testEmail = "test-recipient@example.com"; // CHANGE THIS to your email for testing
  const testOrg = "Auricai Test Corp";
  const testToken = "test-token-123";
  const testName = "Test Receiver";

  console.log("🧪 [TEST] Starting Direct Email Send Verification...");
  
  const success = await EmailService.sendInterviewInvite(
    testEmail,
    testOrg,
    testToken,
    testName
  );

  if (success) {
    console.log("\n🎊 [TEST SUCCESS] Email service is fully functional.");
  } else {
    console.error("\n❌ [TEST FAILED] Check the logs above for the specific API error.");
    process.exit(1);
  }
}

testEmail();
