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
     const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
        headers: { 'Authorization': `Bearer ${key}` }
     });
     const schema = await res.json();
     console.log("ALL PATHS:");
     for (const p in schema.paths) {
        if (p.startsWith('/rpc/')) {
           console.log(p);
           console.log(schema.paths[p].post.parameters || []);
        }
     }
  } catch(e) {
    console.error(e);
  }
}
run();
