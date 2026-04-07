const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
     // Fetch OpenAPI Schema for tables
     const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
        headers: { 'Authorization': `Bearer ${key}` }
     });
     const schema = await res.json();
     console.log("SCHEMA TABLES FOUND:");
     if (schema.definitions) {
        console.log(Object.keys(schema.definitions));
     } else {
        console.log("No definitions");
     }

     // Fetch case_studies structure
     if (schema.definitions && schema.definitions.case_studies) {
       console.log("\nCASE_STUDIES SCHEMA:", schema.definitions.case_studies);
     }
  } catch(e) {
    console.error(e);
  }
}
run();
