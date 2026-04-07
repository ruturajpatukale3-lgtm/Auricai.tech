const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtime() {
  console.log("Setting up realtime subscription for case_studies...");
  
  const channel = supabase.channel('audit-realtime-test')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'case_studies' }, payload => {
      console.log('REALTIME EVENT FIRE:', payload);
    })
    .subscribe((status, err) => {
      console.log("Subscription status:", status);
      if (err) console.error(err);
      
      if (status === 'SUBSCRIBED') {
         // trigger an update
         console.log("Triggering update...");
         supabase.from('case_studies').select('id, org_id').limit(1).then(({data}) => {
             if (data && data.length > 0) {
                 supabase.from('case_studies')
                   .update({ status: 'draft' }) // dummy update
                   .eq('id', data[0].id)
                   .then(res => {
                       console.log("Update sent.");
                   });
             } else {
                 console.log("No case studies to update.");
             }
         });
      }
    });

  // wait 5 seconds then exit
  setTimeout(() => {
     console.log("Exiting test.");
     process.exit(0);
  }, 5000);
}

testRealtime();
