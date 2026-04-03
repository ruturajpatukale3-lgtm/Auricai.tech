import { EmailService } from "../src/lib/services/email.service";

async function testEmail() {
  const recipient = process.argv[2];
  if (!recipient) {
    console.error("Please provide a recipient email: npm run test-email <email>");
    process.exit(1);
  }

  console.log(`Sending test interview invite to ${recipient}...`);
  const success = await EmailService.sendInterviewInvite(
    recipient,
    "Auricai Demo",
    "test-token-123",
    "Early Adopter"
  );

  if (success) {
    console.log("✅ Test email sent successfully!");
  } else {
    console.error("❌ Failed to send test email. Check your RESEND_API_KEY.");
  }
}

testEmail();
