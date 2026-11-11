/**
 * Deterministic SAMPLE data for the Platform Observability dashboard.
 *
 * There is no live data source yet. Figures are modelled on the KYC
 * observability screenshots (15-day window) and scaled to the selected
 * range. Replace `buildObservabilityData` with real fetches later; the tab
 * modules only depend on the returned shape.
 */

export const RANGES = [
  {id: '1h', hours: 1},
  {id: '6h', hours: 6},
  {id: '24h', hours: 24},
  {id: '2d', hours: 48},
  {id: '7d', hours: 168},
  {id: '15d', hours: 360},
  {id: '30d', hours: 720},
  // No time filter on live queries; the sample fallback models 30 days.
  {id: 'all', hours: null}
];
const SAMPLE_ALL_HOURS = 720;
export const DEFAULT_RANGE = '15d';
const BASE_HOURS = 360;

// --- Reference entities (15-day baseline) ----------------------------------

const AGENTS = [
  {key: 'ccm', name: 'Channel Master', type: 'ORCHESTRATOR', srs: 340, completed: 271, failed: 32, llmCalls: 114, tokensIn: 372000, tokensOut: 66000, cost: 0.0222, mcpCalls: 52, avgMs: 1480, p90Ms: 1630},
  {key: 'srm', name: 'SRM Agent', type: 'SRM_AGENT', srs: 340, completed: 303, failed: 0, llmCalls: 0, tokensIn: 0, tokensOut: 0, cost: 0, mcpCalls: 88, avgMs: 0, p90Ms: 0},
  {key: 'ccm_executor', name: 'CCM Executor', type: 'EXECUTOR', srs: 340, completed: 319, failed: 21, llmCalls: 0, tokensIn: 0, tokensOut: 0, cost: 0, mcpCalls: 0, avgMs: 0, p90Ms: 0},
  {key: 'task', name: 'Task Agent', type: 'TASK_AGENT', srs: 340, completed: 303, failed: 0, llmCalls: 0, tokensIn: 0, tokensOut: 0, cost: 0, mcpCalls: 88, avgMs: 0, p90Ms: 0},
  {key: 'kyc', name: 'KYC Agent', type: 'KYC_AGENT', srs: 339, completed: 249, failed: 53, llmCalls: 80, tokensIn: 44000, tokensOut: 6000, cost: 0.2528, mcpCalls: 0, avgMs: 2350, p90Ms: 2770},
  {key: 'change_audit', name: 'Change Audit', type: 'AGENT', srs: 286, completed: 249, failed: 0, llmCalls: 0, tokensIn: 0, tokensOut: 0, cost: 0, mcpCalls: 118, avgMs: 0, p90Ms: 0},
  {key: 'risk', name: 'Risk Agent', type: 'RISK_AGENT', srs: 105, completed: 68, failed: 0, llmCalls: 0, tokensIn: 0, tokensOut: 0, cost: 0, mcpCalls: 0, avgMs: 0, p90Ms: 0},
  {key: 'kyc_address_change', name: 'kyc_address_change', type: 'AGENT', srs: 88, completed: 88, failed: 0, llmCalls: 12, tokensIn: 27000, tokensOut: 2000, cost: 0.1184, mcpCalls: 748, avgMs: 3310, p90Ms: 3890}
];

const MODELS = [
  {id: 'claude-sonnet-4-5', calls: 92, tokensIn: 71000, tokensOut: 8000, cost: 0.3713, inCost: 0.3318, outCost: 0.0395, avgMs: 2480, p90Ms: 3460, callers: {kyc: 80, kyc_address_change: 12}},
  {id: 'nova-micro-v1', calls: 114, tokensIn: 372000, tokensOut: 65000, cost: 0.0222, inCost: 0.0189, outCost: 0.0033, avgMs: 1480, p90Ms: 1630, callers: {ccm: 114}}
];

const TOOLS = [
  {id: 'update_task', calls: 159, errRate: 0, avgMs: 1350, p90Ms: 4210},
  {id: 'update_service_request', calls: 136, errRate: 17.6, avgMs: 1430, p90Ms: 4400},
  {id: 'create_task', calls: 112, errRate: 0, avgMs: 1410, p90Ms: 4260},
  {id: 'get_customer', calls: 88, errRate: 0, avgMs: 1720, p90Ms: 4930},
  {id: 'get_addresses', calls: 88, errRate: 0, avgMs: 1740, p90Ms: 4590},
  {id: 'create_service_request', calls: 88, errRate: 0, avgMs: 1600, p90Ms: 4560},
  {id: 'get_llm_response', calls: 84, errRate: 4.8, avgMs: 3600, p90Ms: 11270},
  {id: 'stage_address_change', calls: 71, errRate: 0, avgMs: 1870, p90Ms: 4880},
  {id: 'store_change_audit', calls: 71, errRate: 0, avgMs: 1650, p90Ms: 4870},
  {id: 'assert_kyc_risk_address_change_for_high_risk_countries', calls: 52, errRate: 0, avgMs: 2950, p90Ms: 15380},
  {id: 'approve_stage_address_change', calls: 44, errRate: 0, avgMs: 1820, p90Ms: 5100},
  {id: 'update_change_audit', calls: 41, errRate: 0, avgMs: 1590, p90Ms: 4570},
  {id: 'get_risk_alert', calls: 30, errRate: 0, avgMs: 1210, p90Ms: 3020},
  {id: 'capture_channel_interaction', calls: 30, errRate: 0, avgMs: 980, p90Ms: 2410}
];

// Agent -> tool call counts (agent x tool matrix).
const MATRIX = {
  ccm: {get_llm_response: 52},
  change_audit: {store_change_audit: 71},
  kyc_address_change: {update_task: 159, update_service_request: 136, create_task: 24, get_customer: 88, get_addresses: 88, get_llm_response: 32, stage_address_change: 71, assert_kyc_risk_address_change_for_high_risk_countries: 52},
  srm: {create_service_request: 88},
  task: {create_task: 88}
};

const PHASES = [
  {agent: 'CCM Executor', phase: 'sr_task_creation', avgMs: 11580, p50Ms: 5290, p95Ms: 46810},
  {agent: 'KYC Agent', phase: 'country_risk_screen', avgMs: 3940, p50Ms: 1220, p95Ms: 15060},
  {agent: 'KYC Agent', phase: 'identity_verification', avgMs: 4730, p50Ms: 2980, p95Ms: 13730},
  {agent: 'KYC Agent', phase: 'escalate_for_review', avgMs: 7340, p50Ms: 7250, p95Ms: 11810},
  {agent: 'Risk Agent', phase: 'raise_alerts_node', avgMs: 5770, p50Ms: 5870, p95Ms: 10030},
  {agent: 'KYC Agent', phase: 'address_extraction', avgMs: 4000, p50Ms: 3040, p95Ms: 8250},
  {agent: 'KYC Agent', phase: 'auto_approve', avgMs: 3510, p50Ms: 2090, p95Ms: 6380},
  {agent: 'KYC Agent', phase: 'address_retrieval', avgMs: 2080, p50Ms: 1080, p95Ms: 5110}
];

// --- Seeded randomness -------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// --- Time buckets --------------------------------------------------------------

function bucketMinutes(hours) {
  if (hours <= 1) return 5;
  if (hours <= 6) return 15;
  return 60;
}

/** Bursty activity profile: mostly idle with a few spikes, like the screenshots. */
function burstWeights(count, rand) {
  const bursts = 3 + Math.floor(rand() * 3);
  const centers = Array.from({length: bursts}, () => ({
    c: count * (0.35 + rand() * 0.6),
    w: Math.max(0.6, count * (0.004 + rand() * 0.01)),
    amp: 0.4 + rand()
  }));
  return Array.from({length: count}, (_, i) => {
    let v = rand() < 0.04 ? 0.03 : 0;
    for (const b of centers) v += b.amp * Math.exp(-(((i - b.c) / b.w) ** 2));
    return v;
  });
}

/** Spreads an integer total across buckets proportionally to `weights`. */
function distribute(total, weights, rand, jitter = 0.3) {
  const w = weights.map(x => x * (1 - jitter / 2 + rand() * jitter));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const out = w.map(x => Math.floor((x / sum) * total));
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = w.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0 && order.length; k = (k + 1) % order.length, rest--) {
    out[order[k][1]] += 1;
  }
  return out;
}

const scaleInt = (v, f) => Math.round(v * f);

// --- Main builder ------------------------------------------------------------

/** Builds every dataset the dashboard renders for one time range. */
export function buildObservabilityData(rangeId, now = new Date()) {
  const range = RANGES.find(r => r.id === rangeId) ?? RANGES.find(r => r.id === DEFAULT_RANGE);
  const rand = mulberry32(seedFor(range.id));
  const hours = range.hours ?? SAMPLE_ALL_HOURS;
  // Small windows keep a floor so the tiles never collapse to zero.
  const f = Math.max(hours / BASE_HOURS, 0.05);

  const minutes = bucketMinutes(hours);
  const count = Math.round((hours * 60) / minutes);
  const end = new Date(Math.floor(now.getTime() / (minutes * 60000)) * minutes * 60000);
  const buckets = Array.from({length: count}, (_, i) => ({
    id: `b${i}`,
    date: new Date(end.getTime() - (count - 1 - i) * minutes * 60000)
  }));
  const profile = burstWeights(count, rand);

  // Agents and models scaled to the window.
  const agents = AGENTS.map(a => {
    const srs = Math.max(1, scaleInt(a.srs, f));
    const failed = scaleInt(a.failed, f);
    const completed = Math.min(srs - failed, scaleInt(a.completed, f));
    return {
      ...a,
      srs,
      completed,
      failed,
      inProgress: Math.max(0, srs - completed - failed),
      llmCalls: scaleInt(a.llmCalls, f),
      tokensIn: scaleInt(a.tokensIn, f),
      tokensOut: scaleInt(a.tokensOut, f),
      tokens: scaleInt(a.tokensIn + a.tokensOut, f),
      cost: a.cost * f,
      mcpCalls: scaleInt(a.mcpCalls, f),
      errRate: srs ? (failed / srs) * 100 : 0
    };
  });
  const models = MODELS.map(m => ({
    ...m,
    calls: scaleInt(m.calls, f),
    tokensIn: scaleInt(m.tokensIn, f),
    tokensOut: scaleInt(m.tokensOut, f),
    cost: m.cost * f,
    inCost: m.inCost * f,
    outCost: m.outCost * f,
    callers: Object.entries(m.callers).map(([agent, calls]) => ({
      agent,
      calls: scaleInt(calls, f)
    }))
  }));
  const tools = TOOLS.map(t => {
    const calls = Math.max(1, scaleInt(t.calls, f));
    return {...t, calls, errors: Math.round((calls * t.errRate) / 100)};
  });
  const matrixCells = [];
  for (const [agent, row] of Object.entries(MATRIX)) {
    for (const [tool, value] of Object.entries(row)) {
      matrixCells.push({x: tool, y: agent, value: Math.max(1, scaleInt(value, f))});
    }
  }

  // Service requests, placed into buckets along the activity profile.
  const totalSrs = agents.find(a => a.key === 'srm').srs;
  const srPerBucket = distribute(totalSrs, profile, rand);
  const srs = [];
  for (let i = count - 1; i >= 0; i--) {
    for (let n = 0; n < srPerBucket[i]; n++) {
      const roll = rand();
      const outcome = roll < 0.54 ? 'approved' : roll < 0.9 ? 'failed' : 'in_progress';
      const full = outcome === 'approved';
      const tokensIn = full && rand() < 0.15 ? 2000 + Math.round(rand() * 600) : 520 + Math.round(rand() * 30);
      const tokensOut = tokensIn > 1500 ? 154 : 66 + Math.round(rand() * 16);
      srs.push({
        number: '',
        time: new Date(buckets[i].date.getTime() + rand() * minutes * 60000),
        outcome,
        durationMs: full ? 20000 + rand() * 60000 : 12000 + rand() * 30000,
        events: full ? 85 + Math.round(rand()) : 43,
        agents: full ? 21 : 14,
        steps: full ? 19 : 8,
        tools: full ? 9 : 4,
        a2a: full ? 47 : 27,
        llmCalls: 1,
        tokensIn,
        tokensOut,
        cost: (tokensIn * 3 + tokensOut * 15) / 1e6 + (tokensIn > 1500 ? 0.0015 : 0.0012)
      });
    }
  }
  srs.sort((a, b) => b.time - a.time);
  // Number newest-first so SR numbers increase with time.
  srs.forEach((s, i) => {
    s.number = `SR-2026-${String(srs.length - i).padStart(6, '0')}`;
  });

  const approved = srs.filter(s => s.outcome === 'approved').length;
  const failed = srs.filter(s => s.outcome === 'failed').length;
  const durations = srs.map(s => s.durationMs).sort((a, b) => a - b);
  const pct = p => durations[Math.min(durations.length - 1, Math.floor(p * durations.length))] ?? 0;

  // LLM call spans: one Sonnet call per SR plus Channel Master Nova calls.
  const spans = [];
  for (const sr of srs) {
    if (spans.length >= 200) break;
    const kycAddress = sr.tokensIn > 1500;
    spans.push({
      time: sr.time,
      agent: kycAddress ? 'kyc_address_change' : 'kyc',
      model: 'claude-sonnet-4-5',
      sr: sr.number,
      latencyMs: kycAddress ? 2900 + rand() * 700 : 1400 + rand() * 900,
      input: sr.tokensIn,
      output: sr.tokensOut,
      cost: sr.cost
    });
    const nova = 1 + Math.floor(rand() * 2);
    for (let k = 0; k < nova && spans.length < 200; k++) {
      const input = 3000 + Math.round(rand() * 400);
      const output = 530 + Math.round(rand() * 120);
      spans.push({
        time: new Date(sr.time.getTime() + (k + 1) * 9000),
        agent: 'ccm',
        model: 'nova-micro-v1',
        sr: null,
        latencyMs: 1330 + rand() * 280,
        input,
        output,
        cost: (input * 0.035 + output * 0.14) / 1e6 * 1.0
      });
    }
  }
  spans.sort((a, b) => b.time - a.time);

  // Time series.
  const failedShare = srPerBucket.map(v => Math.round(v * 0.36));
  const invocationSeries = Object.fromEntries(
    agents.map(a => [a.key, distribute(a.srs, profile, rand)])
  );
  const llmAgents = agents.filter(a => a.llmCalls > 0);
  const tokenSeries = Object.fromEntries(
    llmAgents.map(a => [a.key, distribute(a.tokens, profile, rand, 0.6)])
  );
  const latencySeries = Object.fromEntries(
    ['ccm', 'change_audit', 'kyc_address_change', 'kyc', 'srm', 'task'].map(key => {
      const base = agents.find(a => a.key === key);
      const typical = base.avgMs || 1800 + rand() * 1500;
      return [
        key,
        invocationSeries[key].map(v => (v ? Math.round(typical * (0.6 + rand() * 1.4)) : 0))
      ];
    })
  );
  const modelTokens = Object.fromEntries(
    models.map(m => [m.id, distribute(m.tokensIn + m.tokensOut, profile, rand, 0.6)])
  );
  const modelCalls = Object.fromEntries(
    models.map(m => [m.id, distribute(m.calls, profile, rand)])
  );
  const totalCost = models.reduce((s, m) => s + m.cost, 0);
  const costCents = distribute(Math.round(totalCost * 1e6), profile, rand);
  const tokensIn = models.reduce((s, m) => s + m.tokensIn, 0);
  const tokensOut = models.reduce((s, m) => s + m.tokensOut, 0);
  const mcpTotal = tools.reduce((s, t) => s + t.calls, 0);
  const mcpErrors = tools.reduce((s, t) => s + t.errors, 0);
  const llmCalls = models.reduce((s, m) => s + m.calls, 0);

  return {
    range,
    bucketMinutes: minutes,
    buckets,
    agents,
    models,
    tools,
    matrix: {
      agents: Object.keys(MATRIX),
      tools: tools.slice(0, 10).map(t => t.id),
      cells: matrixCells
    },
    phases: PHASES,
    srs,
    spans,
    kpis: {
      totalSrs,
      approved,
      failed,
      inProgress: totalSrs - approved - failed,
      avgDurationMs: durations.reduce((a, b) => a + b, 0) / (durations.length || 1),
      p95DurationMs: pct(0.95),
      llmCalls,
      llmSpans: Math.min(200, spans.length),
      tokensIn,
      tokensOut,
      cost: totalCost,
      mcpCalls: mcpTotal,
      mcpErrors,
      toolsActive: tools.length,
      agentInvocations: agents.reduce((s, a) => s + a.srs, 0),
      invCompleted: agents.reduce((s, a) => s + a.completed, 0),
      invFailed: agents.reduce((s, a) => s + a.failed, 0),
      invInProgress: agents.reduce((s, a) => s + a.inProgress, 0),
      avgLlmLatencyMs:
        llmAgents.reduce((s, a) => s + a.avgMs * a.llmCalls, 0) /
        (llmAgents.reduce((s, a) => s + a.llmCalls, 0) || 1),
      avgP90Ms: models.reduce((s, m) => s + m.p90Ms, 0) / models.length,
      llmAgents: llmAgents.length
    },
    series: {
      srTotal: srPerBucket,
      srFailed: failedShare,
      invocations: invocationSeries,
      tokens: tokenSeries,
      latency: latencySeries,
      modelTokens,
      modelCalls,
      cost: costCents.map(v => v / 1e6),
      tokensIn: distribute(tokensIn, profile, rand, 0.6),
      tokensOut: distribute(tokensOut, profile, rand, 0.6),
      mcpCalls: distribute(mcpTotal, profile, rand),
      mcpErrors: distribute(mcpErrors, profile, rand)
    }
  };
}

/** Sample detail for one SR in a given range (the full lineage drill-down comes later). */
export function findSampleSr(srNumber, rangeId, now = new Date()) {
  return buildObservabilityData(rangeId, now).srs.find(s => s.number === srNumber) ?? null;
}
