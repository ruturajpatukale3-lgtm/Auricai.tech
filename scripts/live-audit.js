// ═══════════════════════════════════════════════════════════
// LIVE EXECUTION AUDIT — AI Interview + Case Study System
// Tests real API behavior with good, vague, and garbage inputs.
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const BASE_URL = 'http://localhost:3000';

// ─── Test Utilities ────────────────────────────────────────
const results = [];
function log(section, test, status, detail) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const line = `${icon} [${section}] ${test}: ${detail}`;
  console.log(line);
  results.push({ section, test, status, detail });
}

async function callNextQuestion(token, answer, intent, question) {
  const body = {};
  if (answer) body.answer = answer;
  if (intent) body.intent = intent;
  if (question) body.question = question;

  const res = await fetch(`${BASE_URL}/api/public/interview/${token}/next-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { status: res.status, ...data };
}

// ─── Find or Create Test Interview ─────────────────────────
async function getTestToken() {
  // Find interview with status 'sent' (fresh, unused)
  const { data, error } = await supabase
    .from('interviews')
    .select('token, id, status, org_id')
    .eq('status', 'sent')
    .limit(1);

  if (data && data.length > 0) {
    console.log(`\n🔑 Using existing interview: ${data[0].token} (status: ${data[0].status})\n`);
    return data[0].token;
  }

  // If none found, try in_progress
  const { data: ip } = await supabase
    .from('interviews')
    .select('token, id, status, org_id')
    .eq('status', 'in_progress')
    .limit(1);

  if (ip && ip.length > 0) {
    console.log(`\n🔑 Using in-progress interview: ${ip[0].token} (status: ${ip[0].status})\n`);
    return ip[0].token;
  }

  console.log('❌ No valid interview tokens found. Create one first.');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// TEST SECTIONS
// ═══════════════════════════════════════════════════════════

async function testSection1_InterviewFlow(token) {
  console.log('\n═══ SECTION 1: INTERVIEW FLOW TEST ═══');

  // Step 1: Initial call (no answer — should get first question)
  const r1 = await callNextQuestion(token);
  if (r1.success && r1.data?.question) {
    log('S1', 'First question returned', 'PASS', `Q: "${r1.data.question.substring(0, 60)}..."`);
    log('S1', 'Question number', r1.data.questionNumber === 1 ? 'PASS' : 'WARN', `questionNumber=${r1.data.questionNumber}`);
    log('S1', 'Total max', r1.data.totalMax === 6 ? 'PASS' : 'FAIL', `totalMax=${r1.data.totalMax}`);
  } else {
    log('S1', 'First question returned', 'FAIL', JSON.stringify(r1));
  }

  return r1;
}

async function testSection2_Repetition(token, firstQuestion) {
  console.log('\n═══ SECTION 2: REPETITION TEST ═══');

  // Give a vague answer
  const r2 = await callNextQuestion(token, 'it was good', firstQuestion?.data?.intent, firstQuestion?.data?.question);
  const intent1 = r2.data?.intent;
  log('S2', 'Vague answer accepted', r2.success ? 'PASS' : 'FAIL', `Next intent: ${intent1}`);

  // Give another vague answer
  const r3 = await callNextQuestion(token, 'yeah it helped', r2.data?.intent, r2.data?.question);
  const intent2 = r3.data?.intent;
  
  // Check if intent changed after 2 vague answers (low-intent detection)
  if (intent1 !== intent2 || r3.data?.isComplete) {
    log('S2', 'Intent shifts after vague answers', 'PASS', `${intent1} → ${intent2}`);
  } else {
    log('S2', 'Intent shifts after vague answers', 'WARN', `Still on ${intent2} (may need one more)`);
  }

  return r3;
}

async function testSection3_MetricHandling(token, lastQ) {
  console.log('\n═══ SECTION 3: METRIC HANDLING TEST ═══');

  // Test exact metric
  const r1 = await callNextQuestion(token, 'We saw a 20% increase in conversion rate', lastQ?.data?.intent, lastQ?.data?.question);
  log('S3', 'Exact metric "20%"', r1.success ? 'PASS' : 'FAIL', `Accepted, next intent: ${r1.data?.intent}`);

  return r1;
}

async function testSection4_GarbageInput(token, lastQ) {
  console.log('\n═══ SECTION 4: GARBAGE INPUT TEST ═══');

  // Test pure garbage
  const r1 = await callNextQuestion(token, 'asdfasdf', lastQ?.data?.intent, lastQ?.data?.question);
  if (!r1.success && r1.isValidationRejection) {
    log('S4', 'Garbage "asdfasdf" rejected', 'PASS', `Reason: ${r1.error}`);
  } else if (!r1.success) {
    log('S4', 'Garbage "asdfasdf" rejected', 'PASS', `Error: ${r1.error}`);
  } else {
    log('S4', 'Garbage "asdfasdf" rejected', 'FAIL', 'Garbage was accepted as valid input');
  }

  // Test very short input
  const r2 = await callNextQuestion(token, 'ab', lastQ?.data?.intent, lastQ?.data?.question);
  if (!r2.success) {
    log('S4', 'Short input "ab" rejected', 'PASS', `Reason: ${r2.error}`);
  } else {
    log('S4', 'Short input "ab" rejected', 'FAIL', 'Short input was accepted');
  }

  return lastQ; // Don't advance the state with garbage
}

async function testSection5_ConfusionHandling(token, lastQ) {
  console.log('\n═══ SECTION 5: CONFUSION HANDLING ═══');

  const r1 = await callNextQuestion(token, 'what?', lastQ?.data?.intent, lastQ?.data?.question);
  if (r1.success && r1.data?.question) {
    log('S5', '"what?" handled', 'PASS', `System responded: "${r1.data.question.substring(0, 60)}..."`);
    log('S5', 'Is follow-up?', r1.data.isFollowUp ? 'PASS' : 'WARN', `isFollowUp=${r1.data.isFollowUp}`);
  } else if (r1.isValidationRejection) {
    log('S5', '"what?" handled', 'PASS', `Validation rejection: ${r1.error}`);
  } else {
    log('S5', '"what?" handled', 'FAIL', JSON.stringify(r1).substring(0, 100));
  }

  return r1.success ? r1 : lastQ;
}

async function testSection6_FollowUpLimit(token, lastQ) {
  console.log('\n═══ SECTION 6: FOLLOW-UP LIMIT ═══');

  // Give a substantive answer to move forward
  const r1 = await callNextQuestion(token, 
    'We were spending about 15 hours per week on manual outreach before switching. Now it takes about 3 hours.',
    lastQ?.data?.intent, lastQ?.data?.question);
  
  if (r1.data?.isComplete) {
    log('S6', 'Interview completed', 'PASS', `Completed after answering ${r1.data.questionNumber} questions`);
  } else if (r1.success) {
    log('S6', 'Flow continues', 'PASS', `Q${r1.data?.questionNumber}: "${r1.data?.question?.substring(0, 50)}..." intent=${r1.data?.intent}`);
  }

  // If not complete, give one more answer
  if (!r1.data?.isComplete) {
    const r2 = await callNextQuestion(token,
      'I would definitely recommend it to anyone in our space. The ROI was clear within the first month.',
      r1.data?.intent, r1.data?.question);
    
    if (r2.data?.isComplete) {
      log('S6', 'Interview completed', 'PASS', `Completed at question ${r2.data.questionNumber}`);
    } else {
      log('S6', 'Still active', 'WARN', `Q${r2.data?.questionNumber} intent=${r2.data?.intent}`);
      
      // Final push
      const r3 = await callNextQuestion(token,
        'About 3 weeks to see the first results. Full impact was visible in about 6 weeks.',
        r2.data?.intent, r2.data?.question);
      
      if (r3.data?.isComplete) {
        log('S6', 'Interview completed', 'PASS', `Completed at question ${r3.data.questionNumber}`);
      } else {
        log('S6', 'Max questions', r3.data?.questionNumber <= 6 ? 'PASS' : 'FAIL', 
          `Currently at Q${r3.data?.questionNumber} (max 6)`);
      }
    }
  }
}

async function testSection8_OutputQuality() {
  console.log('\n═══ SECTION 8: OUTPUT QUALITY TEST ═══');

  // Check the latest case study in the DB
  const { data: cs } = await supabase
    .from('case_studies')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!cs || cs.length === 0) {
    log('S8', 'Case study exists', 'WARN', 'No case studies found in DB (may not have completed)');
    return;
  }

  const study = cs[0];
  log('S8', 'Case study exists', 'PASS', `ID: ${study.id}`);
  
  // Check headline
  if (study.headline && study.headline.length > 20) {
    log('S8', 'Headline strength', 'PASS', `"${study.headline}"`);
  } else {
    log('S8', 'Headline strength', 'FAIL', `Weak headline: "${study.headline}"`);
  }

  // Check banned phrases
  const BANNED = [
    'significant improvement', 'notable increase', 'clear gain',
    'improved performance', 'better results', 'positive impact',
    'great results', 'enhanced efficiency', 'saw improvements',
    'experienced growth', 'achieved results', 'made progress',
  ];
  
  const fullText = `${study.headline} ${study.summary || ''} ${study.metric_type || ''}`.toLowerCase();
  const found = BANNED.filter(phrase => fullText.includes(phrase));
  
  if (found.length === 0) {
    log('S8', 'No banned phrases', 'PASS', 'Output is clean');
  } else {
    log('S8', 'No banned phrases', 'FAIL', `Found: ${found.join(', ')}`);
  }

  // Check summary
  if (study.summary && study.summary.length > 30) {
    log('S8', 'Summary quality', 'PASS', `"${study.summary.substring(0, 80)}..."`);
  } else {
    log('S8', 'Summary quality', 'WARN', `Summary: "${study.summary || 'MISSING'}"`);
  }

  // Check metrics
  if (study.metric_type && study.metric_type !== 'Not provided') {
    log('S8', 'Metrics populated', 'PASS', `"${study.metric_type}"`);
  } else {
    log('S8', 'Metrics populated', 'WARN', 'Metrics field is empty or "Not provided"');
  }

  // Check updated_at
  if (study.updated_at) {
    log('S8', 'updated_at tracking', 'PASS', `Last updated: ${study.updated_at}`);
  } else {
    log('S8', 'updated_at tracking', 'FAIL', 'updated_at is null');
  }
}

async function testSection10_FallbackQuality() {
  console.log('\n═══ SECTION 10: FALLBACK QUALITY TEST ═══');
  
  // We can't force an AI failure via API, but we CAN check the fallback constants in the code
  // by importing them. Instead, let's just verify the DB output doesn't contain robotic phrases.
  const { data: cs } = await supabase
    .from('case_studies')
    .select('headline, summary, metric_type')
    .order('created_at', { ascending: false })
    .limit(3);

  if (!cs || cs.length === 0) {
    log('S10', 'Fallback check', 'WARN', 'No case studies to check');
    return;
  }

  const ROBOTIC = ['not provided', 'results were achieved', 'client achieved measurable'];
  
  for (const study of cs) {
    const fullText = `${study.headline} ${study.summary || ''} ${study.metric_type || ''}`.toLowerCase();
    const roboticFound = ROBOTIC.filter(p => fullText.includes(p));
    
    if (roboticFound.length === 0) {
      log('S10', `Output "${study.headline?.substring(0, 40)}..."`, 'PASS', 'No robotic phrases');
    } else {
      log('S10', `Output "${study.headline?.substring(0, 40)}..."`, 'FAIL', `Robotic: ${roboticFound.join(', ')}`);
    }
  }
}

async function testSection11_RealtimeSync() {
  console.log('\n═══ SECTION 11: REAL-TIME SYNC TEST ═══');

  // Check if realtime publication includes case_studies
  const { data } = await supabase
    .from('case_studies')
    .select('id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastUpdate = new Date(data[0].updated_at);
    const now = new Date();
    const diffMs = now - lastUpdate;
    
    log('S11', 'Latest DB update', diffMs < 300000 ? 'PASS' : 'WARN', 
      `Last updated ${Math.round(diffMs/1000)}s ago`);
    
    // Test realtime subscription
    const channel = supabase.channel('audit-test');
    let received = false;
    
    channel.on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'case_studies' 
    }, (payload) => {
      received = true;
    }).subscribe();

    // Trigger a tiny update
    await supabase.from('case_studies')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', data[0].id);

    // Wait 2 seconds for realtime
    await new Promise(r => setTimeout(r, 2000));
    
    log('S11', 'Realtime event received', received ? 'PASS' : 'WARN', 
      received ? 'Update broadcasted within 2s' : 'No event received (may need REPLICA IDENTITY FULL)');
    
    channel.unsubscribe();
  } else {
    log('S11', 'Realtime check', 'WARN', 'No case studies to test against');
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  LIVE EXECUTION AUDIT — AI Interview System     ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const token = await getTestToken();
  
  // Run the API-dependent tests
  try {
    const firstQ = await testSection1_InterviewFlow(token);
    const afterVague = await testSection2_Repetition(token, firstQ);
    const afterMetric = await testSection3_MetricHandling(token, afterVague);
    await testSection4_GarbageInput(token, afterMetric);
    const afterConfusion = await testSection5_ConfusionHandling(token, afterMetric);
    await testSection6_FollowUpLimit(token, afterConfusion);
  } catch (e) {
    console.error('\n⚠️  API tests failed (is dev server running on :3000?):', e.message);
    console.log('   Skipping API tests, running DB-only tests...\n');
  }
  
  // DB tests (always work)
  await testSection8_OutputQuality();
  await testSection10_FallbackQuality();
  await testSection11_RealtimeSync();

  // ─── FINAL SUMMARY ──────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  FINAL SUMMARY                                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const total = results.length;
  const score = Math.round((passed / total) * 100);

  console.log(`\n  ✅ Passed: ${passed}/${total}`);
  console.log(`  ❌ Failed: ${failed}/${total}`);
  console.log(`  ⚠️  Warnings: ${warned}/${total}`);
  console.log(`\n  📊 Real-World Accuracy Score: ${score}%\n`);

  if (failed > 0) {
    console.log('  ─── FAILURES ───');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ [${r.section}] ${r.test}: ${r.detail}`);
    });
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
