import {GlideAggregate, GlideRecord, GlideRecordSecure} from '@servicenow/glide';

/**
 * GET /api/x_assro_aict_obser/observability/trends
 *
 * Row-derived data for the Platform Observability dashboard: the "over time"
 * series bucketed on the caller's time axis, latency percentiles, each SR's
 * first-seen time and latest outcome, and the most recent LLM call spans.
 *
 * Everything is aggregated in the database. Spans are written in bursts, so a
 * GROUP BY on the creation timestamp returns a few thousand rows even for tens
 * of thousands of spans; those are bucketed here. Each aggregate stays narrow
 * (timestamp plus at most one dimension) because wide group-bys approach the
 * row count. Percentiles come from per-value histograms of u_duration.
 * (GlideAggregate time trends are not used: on this instance they return
 * duplicate or missing buckets.)
 *
 * The caller must be able to read the span table.
 *
 * Query parameters:
 *   hours  window length in hours; 0 or absent = all time
 *   start  first bucket start, epoch ms (UTC)
 *   step   bucket length, ms
 *   count  number of buckets
 */

const TABLE = 'sn_ai_observe_ai_span';
const TIME_FIELD = 'sys_created_on';
const MAX_BUCKETS = 2000;
const SPAN_LIST_SIZE = 200;

function param(request, name) {
  const value = request.queryParams[name];
  return Array.isArray(value) ? value[0] : value;
}

const has = v => v !== undefined && v !== null && String(v) !== '';

function num(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

/** Internal (UTC) "YYYY-MM-DD HH:mm:ss" value to epoch ms. */
function parseUtc(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(value || '');
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

/** u_duration in ms; tolerates a glide_duration value ("1970-01-01 00:00:01"). */
function durationMs(value) {
  if (!has(value)) return null;
  return String(value).indexOf('-') >= 0 ? parseUtc(value) : num(value);
}

/**
 * Runs a GlideAggregate over the window and calls `each(ga)` per group.
 * `filters` is an encoded query added to the window condition.
 */
function aggregate(window, {filters = '', groupBy = [], aggregates = []}, each) {
  const ga = new GlideAggregate(TABLE);
  window(ga);
  if (filters) ga.addEncodedQuery(filters);
  for (let i = 0; i < groupBy.length; i++) ga.groupBy(groupBy[i]);
  for (let i = 0; i < aggregates.length; i++) {
    const a = aggregates[i];
    if (a[1]) ga.addAggregate(a[0], a[1]);
    else ga.addAggregate(a[0]);
  }
  ga.query();
  while (ga.next()) each(ga);
}

/** Value at percentile `p` of a {value: count} histogram. */
function percentileOfHistogram(histogram, p) {
  const values = [];
  let total = 0;
  histogram.forEach((n, v) => {
    values.push(v);
    total += n;
  });
  if (!total) return null;
  values.sort((a, b) => a - b);
  // Same rank as sorting every value and taking index floor(p * n).
  const rank = Math.min(total - 1, Math.floor(p * total));
  let seen = 0;
  for (let i = 0; i < values.length; i++) {
    seen += histogram.get(values[i]);
    if (seen > rank) return values[i];
  }
  return values[values.length - 1];
}

/** Per-group series, ordered by total desc. */
function groupedSeries(map) {
  const out = [];
  map.forEach((values, label) => {
    let total = 0;
    for (let i = 0; i < values.length; i++) total += values[i];
    out.push({label, values, total});
  });
  out.sort((a, b) => b.total - a.total);
  return out.map(g => ({label: g.label, values: g.values}));
}

export function trends(request, response) {
  if (!new GlideRecordSecure(TABLE).canRead()) {
    response.setStatus(403);
    response.setBody({error: 'No read access to ' + TABLE});
    return;
  }

  const hours = num(param(request, 'hours'));
  const start = num(param(request, 'start'));
  const step = num(param(request, 'step'));
  const count = Math.floor(num(param(request, 'count')));
  if (!(start > 0 && step > 0 && count > 0 && count <= MAX_BUCKETS)) {
    response.setStatus(400);
    response.setBody({error: 'start, step and count (1-' + MAX_BUCKETS + ') are required'});
    return;
  }

  // The window matches the dashboard's other queries (minutesAgoStart).
  const window = gr => {
    if (hours > 0) gr.addEncodedQuery(TIME_FIELD + '>=javascript:gs.minutesAgoStart(' + Math.round(hours * 60) + ')');
  };
  const bucketOf = ga => {
    const t = parseUtc(ga.getValue(TIME_FIELD));
    const b = t == null ? -1 : Math.floor((t - start) / step);
    return b >= 0 && b < count ? b : -1;
  };
  const zeros = () => {
    const a = new Array(count);
    for (let i = 0; i < count; i++) a[i] = 0;
    return a;
  };
  const addTo = (map, key, b, value) => {
    let values = map.get(key);
    if (!values) {
      values = zeros();
      map.set(key, values);
    }
    values[b] += value;
  };
  const series = {
    activity: zeros(),
    failed: zeros(),
    cost: zeros(),
    tokensIn: zeros(),
    tokensOut: zeros(),
    tokensTotal: zeros(),
    costConsumption: zeros(),
    mcpCalls: zeros()
  };
  let spansInWindow = 0;

  // Overview: Activity Trend
  aggregate(window, {groupBy: [TIME_FIELD], aggregates: [['COUNT']]}, ga => {
    const n = num(ga.getAggregate('COUNT'));
    spansInWindow += n;
    const b = bucketOf(ga);
    if (b >= 0) series.activity[b] += n;
  });
  // Overview: failed share (u_sr_outcome=Failed)
  aggregate(window, {filters: 'u_sr_outcome=Failed', groupBy: [TIME_FIELD], aggregates: [['COUNT']]}, ga => {
    const b = bucketOf(ga);
    if (b >= 0) series.failed[b] += num(ga.getAggregate('COUNT'));
  });
  // Overview / FinOps: Costs Over Time, Tokens Over Time
  aggregate(
    window,
    {
      filters: 'token_countISNOTEMPTY',
      groupBy: [TIME_FIELD],
      aggregates: [['SUM', 'cost'], ['SUM', 'input_tokens'], ['SUM', 'output_tokens'], ['SUM', 'token_count']]
    },
    ga => {
      const b = bucketOf(ga);
      if (b < 0) return;
      series.cost[b] += num(ga.getAggregate('SUM', 'cost'));
      series.tokensIn[b] += num(ga.getAggregate('SUM', 'input_tokens'));
      series.tokensOut[b] += num(ga.getAggregate('SUM', 'output_tokens'));
      series.tokensTotal[b] += num(ga.getAggregate('SUM', 'token_count'));
    }
  );
  // FinOps: COST CONSUMPTION OVER TIME
  aggregate(window, {filters: 'costISNOTEMPTY', groupBy: [TIME_FIELD], aggregates: [['SUM', 'cost']]}, ga => {
    const b = bucketOf(ga);
    if (b >= 0) series.costConsumption[b] += num(ga.getAggregate('SUM', 'cost'));
  });
  // MCP Tools: MCP CALL VOLUME TREND
  aggregate(window, {filters: 'u_toolISNOTEMPTY', groupBy: [TIME_FIELD], aggregates: [['COUNT']]}, ga => {
    const b = bucketOf(ga);
    if (b >= 0) series.mcpCalls[b] += num(ga.getAggregate('COUNT'));
  });

  // Agents: Agent Invocation Trend
  const invocations = new Map();
  aggregate(
    window,
    {filters: 'u_agent_nameISNOTEMPTY', groupBy: [TIME_FIELD, 'u_agent_name'], aggregates: [['COUNT']]},
    ga => {
      const b = bucketOf(ga);
      if (b >= 0) addTo(invocations, ga.getValue('u_agent_name'), b, num(ga.getAggregate('COUNT')));
    }
  );
  // Agents: Token Usage Trend
  const agentTokens = new Map();
  aggregate(
    window,
    {
      filters: 'u_agent_nameISNOTEMPTY^token_countISNOTEMPTY',
      groupBy: [TIME_FIELD, 'u_agent_name'],
      aggregates: [['SUM', 'token_count']]
    },
    ga => {
      const b = bucketOf(ga);
      if (b >= 0) addTo(agentTokens, ga.getValue('u_agent_name'), b, num(ga.getAggregate('SUM', 'token_count')));
    }
  );
  // Models: TOKEN USAGE BY MODEL OVER TIME, MODEL CALLS TREND
  const modelTokens = new Map();
  const modelCalls = new Map();
  aggregate(
    window,
    {filters: 'u_modelISNOTEMPTY', groupBy: [TIME_FIELD, 'u_model'], aggregates: [['COUNT'], ['SUM', 'token_count']]},
    ga => {
      const b = bucketOf(ga);
      if (b < 0) return;
      const model = ga.getValue('u_model');
      addTo(modelTokens, model, b, num(ga.getAggregate('SUM', 'token_count')));
      addTo(modelCalls, model, b, num(ga.getAggregate('COUNT')));
    }
  );

  // Latency: p95 over LLM spans; p90 per model over costed spans.
  const durations = new Map();
  aggregate(
    window,
    {filters: 'token_countISNOTEMPTY^u_durationISNOTEMPTY', groupBy: ['u_duration'], aggregates: [['COUNT']]},
    ga => {
      const ms = durationMs(ga.getValue('u_duration'));
      if (ms != null) durations.set(ms, (durations.get(ms) || 0) + num(ga.getAggregate('COUNT')));
    }
  );
  const modelDurations = new Map();
  aggregate(
    window,
    {
      filters: 'u_modelISNOTEMPTY^costISNOTEMPTY^u_durationISNOTEMPTY',
      groupBy: ['u_model', 'u_duration'],
      aggregates: [['COUNT']]
    },
    ga => {
      const ms = durationMs(ga.getValue('u_duration'));
      if (ms == null) return;
      const model = ga.getValue('u_model');
      if (!modelDurations.has(model)) modelDurations.set(model, new Map());
      const h = modelDurations.get(model);
      h.set(ms, (h.get(ms) || 0) + num(ga.getAggregate('COUNT')));
    }
  );
  const modelP90 = {};
  modelDurations.forEach((h, model) => {
    modelP90[model] = percentileOfHistogram(h, 0.9);
  });

  // SRs: first-seen time, and the outcome on the SR's latest outcome span.
  const srs = {};
  aggregate(
    window,
    {filters: 'u_sr_numberISNOTEMPTY', groupBy: ['u_sr_number'], aggregates: [['MIN', TIME_FIELD]]},
    ga => {
      srs[ga.getValue('u_sr_number')] = {time: parseUtc(ga.getAggregate('MIN', TIME_FIELD)), outcome: null};
    }
  );
  const latestOutcome = {};
  aggregate(
    window,
    {
      filters: 'u_sr_numberISNOTEMPTY^u_sr_outcomeISNOTEMPTY',
      groupBy: ['u_sr_number', 'u_sr_outcome'],
      aggregates: [['MAX', TIME_FIELD]]
    },
    ga => {
      const sr = ga.getValue('u_sr_number');
      const t = parseUtc(ga.getAggregate('MAX', TIME_FIELD)) || 0;
      if (!latestOutcome[sr] || t > latestOutcome[sr].t) latestOutcome[sr] = {t, outcome: ga.getValue('u_sr_outcome')};
    }
  );
  for (const sr in latestOutcome) {
    if (!srs[sr]) srs[sr] = {time: null, outcome: null};
    srs[sr].outcome = latestOutcome[sr].outcome;
  }

  // LLM Traces: most recent LLM call spans.
  const recentLlmSpans = [];
  const gr = new GlideRecord(TABLE);
  window(gr);
  gr.addEncodedQuery('token_countISNOTEMPTY');
  gr.orderByDesc(TIME_FIELD);
  gr.setLimit(SPAN_LIST_SIZE);
  gr.query();
  while (gr.next()) {
    recentLlmSpans.push({
      time: parseUtc(gr.getValue(TIME_FIELD)),
      agent: gr.getValue('u_agent_name') || null,
      model: gr.getValue('u_model') || null,
      sr: gr.getValue('u_sr_number') || null,
      latencyMs: durationMs(gr.getValue('u_duration')),
      input: num(gr.getValue('input_tokens')),
      output: num(gr.getValue('output_tokens')),
      cost: num(gr.getValue('cost'))
    });
  }

  response.setStatus(200);
  response.setBody({
    spans: spansInWindow,
    series,
    grouped: {
      invocations: groupedSeries(invocations),
      agentTokens: groupedSeries(agentTokens),
      modelTokens: groupedSeries(modelTokens),
      modelCalls: groupedSeries(modelCalls)
    },
    p95DurationMs: percentileOfHistogram(durations, 0.95),
    modelP90,
    srs,
    recentLlmSpans
  });
}
