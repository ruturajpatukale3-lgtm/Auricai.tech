import fetch from "node-fetch"; // Next.js typically uses global fetch, but we'll use node's global fetch or assume it's available.

async function testFetch() {
  const token = 'g4yl-iSl48pzGCAy1auU-sUY';
  console.log(`Starting hard test for token: ${token}`);
  try {
    const res = await fetch(`http://localhost:3000/api/public/interview/${token}`);
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Body:", JSON.stringify(data, null, 2));
  } catch(e: any) {
    console.log("Failed to fetch:", e.message);
  }
}

testFetch();
