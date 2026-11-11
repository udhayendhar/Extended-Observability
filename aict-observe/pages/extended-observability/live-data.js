import {isServer} from 'lit';
import {aiuxFetch, getLogger} from '@servicenow/aiux/aiux-components-core';
import {sampleAsLive} from './live-shape.js';

export {sampleAsLive};

/**
 * Live data for the Platform Observability dashboard, read from the AI span
 * table using the widget definitions in IDB_DASHBOARD_WIDGETS.md.
 *
 * - Single values and group-bys use the Aggregate (Stats) API, so they are
 *   exact regardless of volume.
 * - Trends ("over time"), latency percentiles, SR first-seen/outcome and the
 *   recent LLM spans come from this app's Scripted REST API (TRENDS_API,
 *   src/server/observability-trends.js), which aggregates in the database on
 *   the dashboard's time axis.
 *
 * Every query is scoped to the selected time range on TIME_FIELD.
 * `sampleAsLive()` produces the same shape from sample data so the tabs have
 * one code path when the instance is unreachable.
 */

const log = getLogger('x-assro-aict-obser-obs-dashboard-page');

export const SPAN_TABLE = 'sn_ai_observe_ai_span';
const TIME_FIELD = 'sys_created_on';
const TRENDS_API = '/api/x_assro_aict_obser/observability/trends';
const MATRIX_TOOLS = 10;

// --- REST helpers ------------------------------------------------------------

// The instance serves two requests per session at a time, queues a few more,
// and answers the rest with an empty 202. Cap what is in flight and retry 202s.
const MAX_IN_FLIGHT = 4;
const MAX_ATTEMPTS = 3;
let inFlight = 0;
const waiting = [];

async function limited(task) {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise(resolve => waiting.push(resolve));
  inFlight++;
  try {
    return await task();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/** A request that hasn't answered by then fails, so its section falls back instead of loading forever. */
const REQUEST_TIMEOUT_MS = 120000;

/** fetch that aborts with `signal` or after REQUEST_TIMEOUT_MS. */
async function fetchWithTimeout(url, signal) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, {once: true});
  const timer = setTimeout(onAbort, REQUEST_TIMEOUT_MS);
  try {
    return await aiuxFetch(url, {headers: {Accept: 'application/json'}, signal: ctrl.signal});
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** The instance's own error text from a failed REST response, if it sent one. */
async function responseError(res) {
  try {
    const body = await res.json();
    const err = body?.error;
    return [err?.message, err?.detail].filter(Boolean).join(' — ');
  } catch {
    return '';
  }
}

/**
 * GET a REST endpoint and return its `result`. Failures throw an Error whose
 * message names the endpoint, the HTTP status and the instance's error text,
 * so the live page can show the cause on screen.
 */
async function getResult(path, params, signal) {
  const url = `${path}?${new URLSearchParams(params)}`;
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await limited(() => fetchWithTimeout(url, signal));
    } catch (error) {
      if (signal?.aborted) throw error;
      const cause =
        error?.name === 'AbortError'
          ? `no response after ${REQUEST_TIMEOUT_MS / 1000} s`
          : error?.message || String(error);
      throw new Error(`${path}: ${cause}`, {cause: error});
    }
    if (res.status === 202 && attempt < MAX_ATTEMPTS) {
      await delay(500 * attempt);
      continue;
    }
    if (!res.ok || res.status === 202) {
      const detail = res.status === 202 ? 'instance is busy (202 after retries)' : await responseError(res);
      log.error({status: res.status, path, detail}, 'Observability request failed');
      throw new Error(`${path}: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
    }
    let body;
    try {
      body = await res.json();
    } catch {
      throw new Error(`${path}: HTTP ${res.status} — response is not JSON (session expired or redirected?)`);
    }
    return body?.result;
  }
}

/** Error message for a rejected source. */
const errorText = reason => reason?.message || String(reason ?? 'Unknown error');

const num = v => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Stats API. Returns [{key: [groupValues], label: [groupLabels], count, sum, avg}]
 * when grouped, otherwise a single {count, sum, avg}.
 */
async function stats(query, {groupBy = [], sum = [], avg = [], signal} = {}) {
  const params = {sysparm_query: query, sysparm_count: 'true', sysparm_display_value: 'all'};
  if (groupBy.length) params.sysparm_group_by = groupBy.join(',');
  if (sum.length) params.sysparm_sum_fields = sum.join(',');
  if (avg.length) params.sysparm_avg_fields = avg.join(',');
  const result = await getResult(`/api/now/stats/${SPAN_TABLE}`, params, signal);

  const read = s => ({
    count: num(s?.count),
    sum: Object.fromEntries(sum.map(f => [f, num(s?.sum?.[f])])),
    avg: Object.fromEntries(avg.map(f => [f, num(s?.avg?.[f])]))
  });
  if (!groupBy.length) return read(result?.stats);

  return (Array.isArray(result) ? result : []).map(row => {
    const fields = row.groupby_fields ?? [];
    const g = f => fields.find(x => x.field === f);
    return {
      key: groupBy.map(f => g(f)?.value ?? ''),
      label: groupBy.map(f => g(f)?.display_value || g(f)?.value || ''),
      ...read(row.stats)
    };
  });
}

/** Server-aggregated trend data for the window on the given time axis. */
function fetchTrends(hours, {start, step, count}, signal) {
  return getResult(
    TRENDS_API,
    {hours: String(hours ?? 0), start: String(start), step: String(step), count: String(count)},
    signal
  );
}

// --- Helpers -----------------------------------------------------------------

const has = v => v !== undefined && v !== null && String(v) !== '';

/** Internal (UTC) "YYYY-MM-DD HH:mm:ss" value to a Date. */
function parseUtc(value) {
  if (!has(value)) return null;
  const d = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Outcome value to the id used for colors and badges ("In Progress" -> in_progress). */
export function outcomeId(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

const byValueDesc = (a, b) => b.value - a.value;

const mean = values => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

// --- Main loader -------------------------------------------------------------

const settled = r => (r.status === 'fulfilled' ? r.value : null);

const DAY_MINUTES = 1440;
const WEEK_MINUTES = 7 * DAY_MINUTES;
const MAX_DAILY_BUCKETS = 180;

/**
 * Time axis for the "all" range: daily buckets from the oldest span to now,
 * weekly when that is more than MAX_DAILY_BUCKETS days. Buckets start at UTC
 * midnight.
 */
async function allTimeAxis(now, signal) {
  const first = await getResult(
    `/api/now/table/${SPAN_TABLE}`,
    {
      sysparm_query: `${TIME_FIELD}ISNOTEMPTY^ORDERBY${TIME_FIELD}`,
      sysparm_fields: TIME_FIELD,
      sysparm_limit: '1',
      sysparm_exclude_reference_link: 'true'
    },
    signal
  );
  const oldest = parseUtc(first?.[0]?.[TIME_FIELD]) ?? now;
  const dayMs = DAY_MINUTES * 60000;
  const startDay = Math.floor(oldest.getTime() / dayMs) * dayMs;
  const days = Math.floor((now.getTime() - startDay) / dayMs) + 1;
  const bucketMinutes = days > MAX_DAILY_BUCKETS ? WEEK_MINUTES : DAY_MINUTES;
  const step = bucketMinutes * 60000;
  const count = Math.max(1, Math.ceil((now.getTime() - startDay + 1) / step));
  return {
    bucketMinutes,
    buckets: Array.from({length: count}, (_, i) => ({id: `b${i}`, date: new Date(startDay + i * step)}))
  };
}

/**
 * Awaits every source; returns the values, the names of those that failed and
 * each failure's message (`errors`, keyed by source name).
 */
async function settleAll(sources, signal) {
  const names = Object.keys(sources);
  const results = await Promise.allSettled(Object.values(sources));
  const got = Object.fromEntries(names.map((n, i) => [n, settled(results[i])]));
  const failed = names.filter((n, i) => results[i].status === 'rejected');
  const errors = Object.fromEntries(failed.map(n => [n, errorText(results[names.indexOf(n)].reason)]));
  // An aborted load (newer range or refresh) is not a failure worth logging.
  if (!signal?.aborted) {
    failed.forEach(n =>
      log.error({source: n, error: results[names.indexOf(n)].reason}, 'Live observability source failed')
    );
  }
  return {got, failed, errors};
}

/** Thrown when no live source loaded; `errors` maps each source to its failure. */
export class LiveDataError extends Error {
  constructor(errors) {
    super(`Live observability data could not be loaded (${Object.keys(errors).length} sources failed)`);
    this.name = 'LiveDataError';
    this.errors = errors;
  }
}

/**
 * Loads every live dataset for the selected range. The trends request (one
 * call to TRENDS_API, the slowest source) starts first and runs alongside the
 * Stats API queries. When the stats settle, `onSummary` receives a dataset
 * built from them with `trendsPending` set, so the page renders KPIs and
 * group-by charts while the trend charts show placeholders.
 *
 * The sample dataset supplies the time buckets so both share one x axis,
 * except for the "all" range, whose axis spans the oldest span to now.
 * Sources that fail fall back to the sample equivalent and are listed in
 * `failed`. `signal` aborts every request.
 */
export async function loadLiveData(sample, {now = new Date(), signal, onSummary} = {}) {
  if (isServer) return null;
  const hours = sample.range.hours;
  // The "all" range (hours === null) applies no time filter.
  const w = hours == null ? '' : `${TIME_FIELD}>=javascript:gs.minutesAgoStart(${hours * 60})`;
  const q = filter => [w, filter].filter(Boolean).join('^');
  let axis = null;
  if (hours == null) {
    try {
      axis = await allTimeAxis(now, signal);
    } catch (error) {
      if (signal?.aborted) return null;
      throw new LiveDataError({timeAxis: errorText(error)});
    }
  }
  const s = (filter, opts = {}) => stats(q(filter), {...opts, signal});

  const buckets = axis?.buckets ?? sample.buckets;
  const bucketMinutes = axis?.bucketMinutes ?? sample.bucketMinutes;
  const trendsRequest = settleAll(
    {
      trends: fetchTrends(
        hours,
        {start: buckets[0].date.getTime(), step: bucketMinutes * 60000, count: buckets.length},
        signal
      )
    },
    signal
  );

  const summarySources = {
    // Overview: SR Outcome Distribution (also Approved / Failed tiles)
    outcomes: s('u_sr_outcomeISNOTEMPTY', {groupBy: ['u_sr_outcome']}),
    // Overview: LLM Calls, AVG Duration (ms); Models: Total LLM Calls, Input Tokens, Total Tokens
    llm: s('token_countISNOTEMPTY', {
      sum: ['input_tokens', 'output_tokens', 'token_count'],
      avg: ['u_duration']
    }),
    // Overview: AVG Cost
    avgCost: s('costISNOTEMPTY', {avg: ['cost']}),
    // Overview: Total Costs; Models: LLM Costs; FinOps: Total LLM Spend; Activity total
    totals: s('', {sum: ['cost']}),
    // Overview / FinOps / Exec View: Costs per Agent, COST BY AGENT
    agentCost: s('costISNOTEMPTY^u_agent_nameISNOTEMPTY', {groupBy: ['u_agent_name'], sum: ['cost']}),
    // Overview: AVG Tokens per Agent, Total Tokens per Agent
    agentTokens: s('token_countISNOTEMPTY^u_agent_nameISNOTEMPTY', {
      groupBy: ['u_agent_name'],
      sum: ['token_count'],
      avg: ['token_count']
    }),
    // Performance: Error rate by agent (failed spans / spans per agent)
    agentCalls: s('u_agent_nameISNOTEMPTY', {groupBy: ['u_agent_name']}),
    agentFailed: s('u_agent_nameISNOTEMPTY^u_sr_outcome=Failed', {groupBy: ['u_agent_name']}),
    // Models: calls per model; Performance: Model usage by token count
    modelCalls: s('u_modelISNOTEMPTY', {
      groupBy: ['u_model'],
      sum: ['input_tokens', 'output_tokens', 'token_count']
    }),
    // Models / FinOps / Overview / Exec View: COST DISTRIBUTION, COST BY MODEL, LATENCY BY MODEL
    modelCost: s('u_modelISNOTEMPTY^costISNOTEMPTY', {
      groupBy: ['u_model'],
      sum: ['cost'],
      avg: ['u_duration']
    }),
    // MCP Tools / FinOps: TOOL PERFORMANCE, Tools Volume Share, MCP TOOL CALL VOLUME
    tools: s('u_toolISNOTEMPTY', {groupBy: ['u_tool']}),
    // MCP Tools: Agent x Tool Call Matrix
    matrix: s('u_toolISNOTEMPTY^u_agent_nameISNOTEMPTY', {groupBy: ['u_tool', 'u_agent_name']}),
    // SR Lookup; LLM Traces / Exec View: Top SRs by cost
    srs: s('u_sr_numberISNOTEMPTY', {
      groupBy: ['u_sr_number'],
      sum: ['input_tokens', 'output_tokens', 'token_count', 'cost']
    }),
    // LLM Traces / Exec View: LLM calls per SR
    srCalls: s('u_sr_numberISNOTEMPTY^token_countISNOTEMPTY', {groupBy: ['u_sr_number']})
  };
  const summaryCount = Object.keys(summarySources).length;

  const summary = await settleAll(summarySources, signal);
  if (signal?.aborted) return null;
  if (summary.failed.length < summaryCount) {
    onSummary?.(
      buildLive(sample, summary.got, summary.failed, axis, {trendsPending: true, errors: summary.errors})
    );
  }

  const trend = await trendsRequest;
  if (signal?.aborted) return null;

  const failed = [...summary.failed, ...trend.failed];
  const errors = {...summary.errors, ...trend.errors};
  if (failed.length === summaryCount + 1) throw new LiveDataError(errors);
  return buildLive(sample, {...summary.got, ...trend.got}, failed, axis, {errors});
}

/**
 * Builds the live dataset. With `trendsPending`, the trend data (series,
 * percentiles, SR first-seen time and outcome, recent spans) is not loaded
 * yet; trend charts show a placeholder and the percentiles stay empty.
 */
function buildLive(sample, got, failed, axis, {trendsPending = false, errors = {}} = {}) {
  const fallback = sampleAsLive(sample);
  const buckets = axis?.buckets ?? sample.buckets;
  const bucketMinutes = axis?.bucketMinutes ?? sample.bucketMinutes;
  const count = buckets.length;
  const t = got.trends;

  const live = {
    ...fallback,
    source: 'live',
    failed,
    errors,
    trendsPending,
    bucketMinutes,
    buckets,
    kpis: {...fallback.kpis},
    series: {...fallback.series}
  };
  // Sample series don't match a live "all" axis, so start from empty ones.
  if (axis) {
    const zeros = () => new Array(count).fill(0);
    for (const [key, value] of Object.entries(live.series)) {
      live.series[key] = Array.isArray(value) && typeof value[0] === 'object' ? [] : zeros();
    }
  }
  const k = live.kpis;
  // Don't show sample percentiles while the live trends are still loading.
  if (trendsPending) {
    k.p95DurationMs = null;
    k.avgP90Ms = null;
  }

  if (got.outcomes) {
    live.outcomes = got.outcomes
      .map(g => ({id: outcomeId(g.key[0]), label: g.label[0], value: g.count}))
      .sort(byValueDesc);
    const find = id => live.outcomes.find(o => o.id === id)?.value ?? 0;
    k.approved = find('approved');
    k.failed = find('failed');
    k.totalSrs = live.outcomes.reduce((s, o) => s + o.value, 0);
  }
  if (got.llm) {
    k.llmCalls = got.llm.count;
    k.avgDurationMs = got.llm.avg.u_duration;
    k.tokensIn = got.llm.sum.input_tokens;
    k.tokensOut = got.llm.sum.output_tokens;
    k.totalTokens = got.llm.sum.token_count;
  }
  if (got.avgCost) k.avgCost = got.avgCost.avg.cost;
  if (got.totals) {
    k.cost = got.totals.sum.cost;
    k.spans = got.totals.count;
  }

  const items = (groups, value) =>
    (groups ?? [])
      .filter(g => has(g.key[0]))
      .map(g => ({id: g.key[0], label: g.label[0], value: value(g)}))
      .sort(byValueDesc);
  if (got.agentCost) live.agentCosts = items(got.agentCost, g => g.sum.cost);
  if (got.agentTokens) {
    live.agentTokens = items(got.agentTokens, g => g.sum.token_count);
    live.agentAvgTokens = items(got.agentTokens, g => Math.round(g.avg.token_count));
    k.llmAgents = live.agentTokens.length;
  }
  if (got.agentCalls) {
    const failedBy = new Map((got.agentFailed ?? []).map(g => [g.key[0], g.count]));
    live.agentErrors = items(got.agentCalls, g => g.count).map(a => {
      const failedCount = failedBy.get(a.id) ?? 0;
      return {id: a.id, label: a.label, calls: a.value, failed: failedCount, errRate: (failedCount / a.value) * 100};
    });
  }

  if (got.modelCalls || got.modelCost) {
    const models = new Map();
    const model = id => {
      if (!models.has(id)) {
        models.set(id, {id, calls: 0, cost: 0, avgMs: 0, p90Ms: null, tokensIn: 0, tokensOut: 0, tokens: 0});
      }
      return models.get(id);
    };
    for (const g of got.modelCalls ?? []) {
      if (!has(g.key[0])) continue;
      const m = model(g.key[0]);
      m.calls = g.count;
      m.tokensIn = g.sum.input_tokens;
      m.tokensOut = g.sum.output_tokens;
      m.tokens = g.sum.token_count;
    }
    for (const g of got.modelCost ?? []) {
      if (!has(g.key[0])) continue;
      model(g.key[0]).cost = g.sum.cost;
      model(g.key[0]).avgMs = g.avg.u_duration;
    }
    for (const m of models.values()) m.p90Ms = t?.modelP90?.[m.id] ?? null;
    live.models = [...models.values()].sort((a, b) => b.calls - a.calls);
    if (t) k.avgP90Ms = mean(live.models.map(m => m.p90Ms).filter(v => v != null));
  }

  if (got.tools) {
    live.tools = items(got.tools, g => g.count).map(tool => ({id: tool.id, label: tool.label, calls: tool.value}));
  }
  if (got.matrix) {
    const cells = got.matrix
      .filter(g => has(g.key[0]) && has(g.key[1]))
      .map(g => ({x: g.key[0], y: g.key[1], value: g.count}));
    const totals = field => {
      const m = new Map();
      for (const c of cells) m.set(c[field], (m.get(c[field]) ?? 0) + c.value);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    };
    live.matrix = {tools: totals('x').slice(0, MATRIX_TOOLS), agents: totals('y'), cells};
  }

  if (got.srs) {
    const llmCalls = new Map((got.srCalls ?? []).map(g => [g.key[0], g.count]));
    live.srs = got.srs
      .filter(g => has(g.key[0]))
      .map(g => {
        // First-seen time and latest outcome come from the trends request.
        const seen = t?.srs?.[g.key[0]];
        return {
          number: g.key[0],
          time: seen?.time ? new Date(seen.time) : null,
          outcome: seen?.outcome ? outcomeId(seen.outcome) : null,
          outcomeLabel: seen?.outcome ?? null,
          events: g.count,
          llmCalls: llmCalls.get(g.key[0]) ?? 0,
          tokensIn: g.sum.input_tokens,
          tokensOut: g.sum.output_tokens,
          tokens: g.sum.token_count,
          cost: g.sum.cost,
          durationMs: null,
          agents: null,
          steps: null,
          tools: null,
          a2a: null
        };
      })
      .sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0));
  }

  if (t) {
    const keyed = groups => groups.map((g, n) => ({key: `s${n}`, label: g.label, values: g.values}));
    k.p95DurationMs = t.p95DurationMs;
    live.series = {
      ...live.series,
      ...t.series,
      invocations: keyed(t.grouped.invocations),
      agentTokens: keyed(t.grouped.agentTokens),
      modelTokens: keyed(t.grouped.modelTokens),
      modelCalls: keyed(t.grouped.modelCalls)
    };
    live.spans = t.recentLlmSpans.map(span => ({...span, time: new Date(span.time)}));
  }

  return live;
}


/** Live summary for one SR (SR detail page). Null if it has no spans. */
export async function loadLiveSr(srNumber) {
  // '^' would let the value extend the encoded query.
  if (isServer || !srNumber || srNumber.includes('^')) return null;
  const query = `u_sr_number=${srNumber}`;
  const [total, latestRows, startRows] = await Promise.all([
    stats(query, {sum: ['input_tokens', 'output_tokens', 'token_count', 'cost']}),
    // Latest outcome recorded for the SR.
    getResult(`/api/now/table/${SPAN_TABLE}`, {
      sysparm_query: `${query}^u_sr_outcomeISNOTEMPTY^ORDERBYDESC${TIME_FIELD}`,
      sysparm_fields: `${TIME_FIELD},u_sr_outcome`,
      sysparm_limit: '1',
      sysparm_exclude_reference_link: 'true'
    }),
    // Earliest span gives the SR start time.
    getResult(`/api/now/table/${SPAN_TABLE}`, {
      sysparm_query: `${query}^ORDERBY${TIME_FIELD}`,
      sysparm_fields: TIME_FIELD,
      sysparm_limit: '1',
      sysparm_exclude_reference_link: 'true'
    })
  ]);
  if (!total.count) return null;
  const latest = latestRows?.[0];
  return {
    number: srNumber,
    time: parseUtc(startRows?.[0]?.[TIME_FIELD]),
    outcome: latest ? outcomeId(latest.u_sr_outcome) : null,
    outcomeLabel: latest?.u_sr_outcome ?? null,
    events: total.count,
    tokensIn: total.sum.input_tokens,
    tokensOut: total.sum.output_tokens,
    cost: total.sum.cost,
    durationMs: null,
    agents: null,
    steps: null,
    tools: null,
    a2a: null
  };
}
