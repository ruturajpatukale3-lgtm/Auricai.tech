const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Env
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').filter(l => !l.startsWith('#')).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function runAudit() {
  console.log('═══ ANALYTICS UPGRADE VERIFICATION ═══\n');

  // 2. Get Org ID
  const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
  if (!orgs || orgs.length === 0) {
    console.error('❌ No organizations found.');
    return;
  }
  const orgId = orgs[0].id;
  console.log(`Using Org: ${orgs[0].name} (${orgId})\n`);

  // 3. Test Metric Calculation Logic
  console.log('--- SECTION 1: METRIC LOGIC ---');
  
  // Get RAW status counts
  const { data: interviews } = await supabase.from('interviews').select('status').eq('org_id', orgId);
  const total = interviews.length;
  const completed = interviews.filter(i => i.status === 'completed').length;
  const approved = interviews.filter(i => i.status === 'approved').length;
  const published = interviews.filter(i => i.status === 'published').length;
  const activeStatuses = ['sent', 'opened', 'in_progress'];
  const pending = interviews.filter(i => activeStatuses.includes(i.status)).length;
  
  const terminalCount = completed + approved + published;
  const expectedSuccessRate = total > 0 ? Math.round((terminalCount / total) * 100) : 0;

  console.log(`Total: ${total}`);
  console.log(`Completed: ${completed}`);
  console.log(`Approved: ${approved}`);
  console.log(`Published: ${published}`);
  console.log(`Terminal Total: ${terminalCount}`);
  console.log(`Pending (Active): ${pending}`);
  console.log(`Expected Success Rate: ${expectedSuccessRate}%`);

  // 4. Test Question Drop-off
  console.log('\n--- SECTION 2: DROP-OFF LOGIC ---');
  const { data: progress } = await supabase
    .from('interview_progress')
    .select('last_question_index')
    .in('interview_id', interviews.filter(i => activeStatuses.includes(i.status)).map(i => i.id));
  
  const dropoffMap = {};
  (progress || []).forEach(p => {
    dropoffMap[p.last_question_index] = (dropoffMap[p.last_question_index] || 0) + 1;
  });
  console.log('Drop-off Per Question Index:', dropoffMap);

  // 5. Case Study Performance
  console.log('\n--- SECTION 3: CASE STUDY PERFORMANCE ---');
  const { data: caseStudies } = await supabase
    .from('case_studies')
    .select('company_name, views, clicks, total_read_time')
    .eq('org_id', orgId)
    .limit(3);
  
  if (caseStudies && caseStudies.length > 0) {
    caseStudies.forEach(cs => {
      console.log(`- ${cs.company_name}: ${cs.views} views, ${cs.clicks} clicks, ${Math.round(cs.total_read_time)}s read`);
    });
  } else {
    console.log('No case studies found.');
  }

  console.log('\n✅ Script validation complete. Compare these numbers with the Analytics dashboard.');
}

runAudit().catch(console.error);
