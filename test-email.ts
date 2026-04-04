import { Resend } from "resend";


const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Auricai <noreply@auricai.tech>";

const resend = new Resend(RESEND_API_KEY);

async function testEmailFlow() {
  const email = "yourgmail@gmail.com";
  const interviewLink = "https://auricai.tech/interview/test-token-123";

  console.log("----------------------------------");
  console.log("STEP 1: VERIFY FUNCTION EXECUTION");
  console.log("----------------------------------");
  console.log("EMAIL FUNCTION START\n");

  console.log("----------------------------------");
  console.log("STEP 4: VERIFY ENV");
  console.log("----------------------------------");
  console.log("API KEY PRESENCE:", !!RESEND_API_KEY);
  console.log("FROM:", FROM_EMAIL, "\n");

  console.log("----------------------------------");
  console.log("STEP 2: VERIFY PAYLOAD");
  console.log("----------------------------------");
  const payload = {
    to: email,
    from: FROM_EMAIL,
    subject: "TEST EMAIL FLOW",
    html: `<p>TEST EMAIL. Link: ${interviewLink}</p>`
  };
  console.log(payload, "\n");

  console.log("----------------------------------");
  console.log("STEP 3 & 6: FORCE RESPONSE LOG / TEST DIRECT SEND");
  console.log("----------------------------------");
  try {
    const res = await resend.emails.send(payload);
    console.log("RESEND SUCCESS:", res);
  } catch (err) {
    console.error("RESEND ERROR:", err);
  }
}

testEmailFlow();
