# Rebuild spec 2 — Extended Observability: live data

**For the coding agent.** Apply this **after** spec 1 (`REBUILD-1-OBSERVABILITY-PAGE-SAMPLE-DATA.md`)
is built and verified. It switches the dashboard and SR detail from the sample dataset to live
data from the ServiceNow table `sn_ai_observe_ai_span`. Create or replace the files exactly as
shown, and replace the placeholders as in spec 1 §2 (`{{TAG_PREFIX}}`, `{{SCOPE}}`). Do not change
the logic.

Live data never breaks the page. Any query that fails or times out (2 min) falls back to the sample
value for that section, and errors are logged to the browser console as
`[observability] live data failed` / `Live observability source failed`.

---

## 1. Instance prerequisites (check first)

| # | Requirement | How to check |
|---|---|---|
| 1 | AI Experience / Karuna enabled | `sys_properties`: `glide.ai_experience.use_karuna_workload = true` |
| 2 | Plugin **AI Control Tower – Evaluations** (`sn_ai_observe`) installed | `sys_scope` has `sn_ai_observe` (worked with 3.0.2) |
| 3 | Table `sn_ai_observe_ai_span` exists, **Accessible from: All application scopes**, **Can read** = true | `sys_db_object` (`access=public`, `read_access=true`) |
| 4 | The 9 custom fields below exist on `sn_ai_observe_ai_span` | `sys_dictionary`, table `sn_ai_observe_ai_span`, element starts with `u_` |
| 5 | The user viewing the page can read `sn_ai_observe_ai_span` (table ACL). The page uses the Stats API (`/api/now/stats`) and, for SR detail, the Table API (`/api/now/table`) | Open `sn_ai_observe_ai_span.list` as that user |

### 1.1 Custom fields on `sn_ai_observe_ai_span`

These fields are **not** part of the plugin. They must be created in the **`sn_ai_observe`
scope** (AI Control Tower – Evaluations) by an admin. The table's configuration is locked to its
own scope (`configuration_access=false`), so **the app cannot create them**. Field names must be
exactly as below, because every query uses them.

| Column name | Label | Type | Max length | Used for |
|---|---|---|---|---|
| `u_agent_name` | Agent Name | String | 40 | agent group-bys |
| `u_model` | Model | String | 40 | model group-bys |
| `u_tool` | Tool | String | 40 | MCP tool calls (non-empty = tool span) |
| `u_sr_number` | SR Number | String | 40 | SR group-bys, SR detail |
| `u_sr_outcome` | SR Outcome | String | 40 | outcome (`approved`, `failed`, `in_progress`; any case) |
| `u_duration` | Duration (ms) | Integer | — | latency (ms) |
| `u_input_cost` | Input Cost | Currency | — | (not read by the page; keep for parity) |
| `u_output_cost` | Output Cost | Currency | — | (not read by the page; keep for parity) |
| `u_processed` | Processed | True/False | — | (not read by the page; keep for parity) |

The page also reads the plugin's own fields: `sys_created_on` (time), `cost` (currency),
`token_count`, `input_tokens`, `output_tokens` (integers).

**Fastest way to copy the fields from an instance that has them:** open `sys_dictionary.list` with
`name=sn_ai_observe_ai_span^elementSTARTSWITHu_`, then **Export → XML**. On the target instance,
use **Import XML** on any list.

**Data semantics the queries assume:** an **LLM call** is a span with `token_count` set; a **tool
call** is a span with `u_tool` set; a **costed** span has `cost` set; an SR's outcome is the
`u_sr_outcome` of its latest span that has one.

---

## 2. Cross-scope access

The app reads `sn_ai_observe_ai_span` (another scope) from the browser (Stats API) and from a
scripted REST API. The working instance had these **cross-scope privileges** for the app's scope,
all **Allowed** (`sys_scope_privilege`). They're normally created automatically on first use; if a
request fails with a cross-scope error, add or allow them:

| Target | Type | Operation |
|---|---|---|
| `sn_ai_observe_ai_span` | Table (`sys_db_object`) | read |
| `RESTAPIRequest` | Scriptable | execute |
| `ScriptableServiceResultBuilder.setStatus`, `.setBody` | Scriptable | execute |

---

## 3. Files to create or replace

### 3.1 Turn on live data in both pages (replace)

#### `pages/extended-observability/page.js`

```js
import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import {withObservabilityDashboard} from './dashboard.js';

/** Extended Observability dashboard (live data). */
@customElement('{{TAG_PREFIX}}-extended-obs-page')
export default class ExtendedObservabilityPage extends withObservabilityDashboard(AIUXElement) {
  static basePath = '/extended-observability';

  static get heading() {
    return i18n.getMessage('Extended Observability');
  }

  static get subheading() {
    return i18n.getMessage('Monitor health, cost and performance');
  }

  static showDataSource = false;

  static liveData = true;

  static async loader(ctx) {
    return super.loader(ctx);
  }
}
```

#### `pages/extended-observability/sr/[srNumber]/page.js`

```js
import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {withObservabilitySrDetail} from '../../sr-detail.js';

/** SR detail for Extended Observability (live data). */
@customElement('{{TAG_PREFIX}}-extended-obs-sr-page')
export default class ExtendedObservabilitySrPage extends withObservabilitySrDetail(AIUXElement) {
  static basePath = '/extended-observability';

  static showDataSource = false;

  static liveData = true;

  static async loader(ctx) {
    return super.loader(ctx);
  }
}
```

### 3.2 Live data layer (replace the sample-mode stub)

`live-shape.js` from spec 1 stays unchanged; this file imports it.

#### `pages/extended-observability/live-data.js`

```js
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

const log = getLogger('{{TAG_PREFIX}}-obs-dashboard-page');

export const SPAN_TABLE = 'sn_ai_observe_ai_span';
const TIME_FIELD = 'sys_created_on';
const TRENDS_API = '/api/{{SCOPE}}/observability/trends';
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

async function getResult(path, params, signal) {
  const url = `${path}?${new URLSearchParams(params)}`;
  for (let attempt = 1; ; attempt++) {
    const res = await limited(() => fetchWithTimeout(url, signal));
    if (res.status === 202 && attempt < MAX_ATTEMPTS) {
      await delay(500 * attempt);
      continue;
    }
    if (!res.ok || res.status === 202) {
      log.error({status: res.status, path}, 'Observability request failed');
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json())?.result;
  }
}

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

/** Awaits every source; returns the values and the names of those that failed. */
async function settleAll(sources, signal) {
  const names = Object.keys(sources);
  const results = await Promise.allSettled(Object.values(sources));
  const got = Object.fromEntries(names.map((n, i) => [n, settled(results[i])]));
  const failed = names.filter((n, i) => results[i].status === 'rejected');
  // An aborted load (newer range or refresh) is not a failure worth logging.
  if (!signal?.aborted) {
    failed.forEach(n =>
      log.error({source: n, error: results[names.indexOf(n)].reason}, 'Live observability source failed')
    );
  }
  return {got, failed};
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
  const axis = hours == null ? await allTimeAxis(now, signal) : null;
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
    onSummary?.(buildLive(sample, summary.got, summary.failed, axis, {trendsPending: true}));
  }

  const trend = await trendsRequest;
  if (signal?.aborted) return null;

  const failed = [...summary.failed, ...trend.failed];
  if (failed.length === summaryCount + 1) return null;
  return buildLive(sample, {...summary.got, ...trend.got}, failed, axis);
}

/**
 * Builds the live dataset. With `trendsPending`, the trend data (series,
 * percentiles, SR first-seen time and outcome, recent spans) is not loaded
 * yet; trend charts show a placeholder and the percentiles stay empty.
 */
function buildLive(sample, got, failed, axis, {trendsPending = false} = {}) {
  const fallback = sampleAsLive(sample);
  const buckets = axis?.buckets ?? sample.buckets;
  const bucketMinutes = axis?.bucketMinutes ?? sample.bucketMinutes;
  const count = buckets.length;
  const t = got.trends;

  const live = {
    ...fallback,
    source: 'live',
    failed,
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
```

### 3.3 Scripted REST API: server-side trends (create)

Endpoint: `GET /api/{{SCOPE}}/observability/trends?hours&start&step&count`. The client calls it
once per load. It returns the time-bucketed series, latency percentiles, each SR's first-seen
time and latest outcome, and the 200 most recent LLM spans. Everything is aggregated in the
database with `GlideAggregate`. GlideAggregate time trends are deliberately not used, because
they returned duplicate or missing buckets on the instance.

#### `src/fluent/observability-api.now.ts`

```ts
import {RestApi} from '@servicenow/sdk/core';
import {trends} from '../server/observability-trends.js';

/**
 * Server-side aggregation for the Extended Observability dashboard
 * (/extended-observability).
 * GET /api/{{SCOPE}}/observability/trends
 */
RestApi({
  $id: Now.ID['observability-api'],
  name: 'Observability',
  serviceId: 'observability',
  shortDescription: 'Aggregated AI span data for the Platform Observability dashboard',
  produces: 'application/json',
  routes: [
    {
      $id: Now.ID['observability-api-trends'],
      name: 'trends',
      path: '/trends',
      method: 'GET',
      script: trends,
      shortDescription:
        'Time-bucketed series, latency percentiles, SR first-seen/outcome and recent LLM spans for a time window',
      parameters: [
        {$id: Now.ID['observability-api-trends-hours'], name: 'hours', shortDescription: 'Window length in hours; 0 = all time'},
        {$id: Now.ID['observability-api-trends-start'], name: 'start', required: true, shortDescription: 'First bucket start (epoch ms, UTC)'},
        {$id: Now.ID['observability-api-trends-step'], name: 'step', required: true, shortDescription: 'Bucket length (ms)'},
        {$id: Now.ID['observability-api-trends-count'], name: 'count', required: true, shortDescription: 'Number of buckets'}
      ]
    }
  ]
});
```

#### `src/server/observability-trends.js`

```js
import {GlideAggregate, GlideRecord, GlideRecordSecure} from '@servicenow/glide';

/**
 * GET /api/{{SCOPE}}/observability/trends
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
```

Typical response time is about 10 s for 15 days with ~20k spans. It reached about 75 s at peak,
which is why the client timeout is 2 minutes.

---

## 4. How each chart is configured

All queries run against `sn_ai_observe_ai_span`, filtered to the selected window:
`sys_created_on>=javascript:gs.minutesAgoStart(<hours*60>)`. The **All** range has no time filter.

- **Stats** = `GET /api/now/stats/sn_ai_observe_ai_span` with `sysparm_query`, `sysparm_count=true`,
  `sysparm_display_value=all`, plus `sysparm_group_by`, `sysparm_sum_fields` and `sysparm_avg_fields`
  as listed. There are 14 named sources in `loadLiveData()`. At most 4 requests are in flight; an
  HTTP 202 is retried twice.
- **Trends** = the scripted REST API in §3.3 (fields of its response).
- **Sample** = this section always uses the sample dataset (no live source defined). The section
  still renders.

Stats sources (name → filter / group by / aggregates):

| Source | Filter (after window) | Group by | Aggregates |
|---|---|---|---|
| `outcomes` | `u_sr_outcomeISNOTEMPTY` | `u_sr_outcome` | COUNT |
| `llm` | `token_countISNOTEMPTY` | — | COUNT, SUM(input_tokens, output_tokens, token_count), AVG(u_duration) |
| `avgCost` | `costISNOTEMPTY` | — | AVG(cost) |
| `totals` | — | — | COUNT, SUM(cost) |
| `agentCost` | `costISNOTEMPTY^u_agent_nameISNOTEMPTY` | `u_agent_name` | SUM(cost) |
| `agentTokens` | `token_countISNOTEMPTY^u_agent_nameISNOTEMPTY` | `u_agent_name` | SUM(token_count), AVG(token_count) |
| `agentCalls` | `u_agent_nameISNOTEMPTY` | `u_agent_name` | COUNT |
| `agentFailed` | `u_agent_nameISNOTEMPTY^u_sr_outcome=Failed` | `u_agent_name` | COUNT |
| `modelCalls` | `u_modelISNOTEMPTY` | `u_model` | COUNT, SUM(input_tokens, output_tokens, token_count) |
| `modelCost` | `u_modelISNOTEMPTY^costISNOTEMPTY` | `u_model` | SUM(cost), AVG(u_duration) |
| `tools` | `u_toolISNOTEMPTY` | `u_tool` | COUNT |
| `matrix` | `u_toolISNOTEMPTY^u_agent_nameISNOTEMPTY` | `u_tool`, `u_agent_name` | COUNT |
| `srs` | `u_sr_numberISNOTEMPTY` | `u_sr_number` | COUNT, SUM(input_tokens, output_tokens, token_count, cost) |
| `srCalls` | `u_sr_numberISNOTEMPTY^token_countISNOTEMPTY` | `u_sr_number` | COUNT |

Trends response fields (GlideAggregate, grouped by `sys_created_on` and then bucketed):

| Field | Filter | Aggregate |
|---|---|---|
| `series.activity` | — | COUNT per bucket |
| `series.failed` | `u_sr_outcome=Failed` | COUNT per bucket |
| `series.cost`, `tokensIn`, `tokensOut`, `tokensTotal` | `token_countISNOTEMPTY` | SUM(cost, input_tokens, output_tokens, token_count) per bucket |
| `series.costConsumption` | `costISNOTEMPTY` | SUM(cost) per bucket |
| `series.mcpCalls` | `u_toolISNOTEMPTY` | COUNT per bucket |
| `grouped.invocations` | `u_agent_nameISNOTEMPTY` | COUNT per bucket per agent |
| `grouped.agentTokens` | `u_agent_nameISNOTEMPTY^token_countISNOTEMPTY` | SUM(token_count) per bucket per agent |
| `grouped.modelTokens`, `grouped.modelCalls` | `u_modelISNOTEMPTY` | SUM(token_count) / COUNT per bucket per model |
| `p95DurationMs` | `token_countISNOTEMPTY^u_durationISNOTEMPTY` | p95 of u_duration (histogram) |
| `modelP90` | `u_modelISNOTEMPTY^costISNOTEMPTY^u_durationISNOTEMPTY` | p90 of u_duration per model |
| `srs` | `u_sr_numberISNOTEMPTY` (+ `u_sr_outcomeISNOTEMPTY`) | MIN(sys_created_on) per SR; outcome of the latest outcome span |
| `recentLlmSpans` | `token_countISNOTEMPTY` | 200 newest rows: time, agent, model, SR, latency, tokens, cost |

### 4.1 Overview

| Section | Chart | Data |
|---|---|---|
| Platform health (KPIs) | Total SRs, Approved, Failed | Stats `outcomes` (sum of counts; approved / failed buckets) |
| | Avg duration (+ p95), LLM calls | Stats `llm` (AVG u_duration, COUNT) + Trends `p95DurationMs` |
| | LLM cost | Stats `totals` SUM(cost) |
| SR throughput | spline, total + failed over time | Trends `series.activity`, `series.failed` |
| SR outcome distribution | donut | Stats `outcomes` |
| LLM cost by model | bar | Stats `modelCost` SUM(cost) |
| Cost & tokens by agent | bar lists: cost, avg tokens, total tokens | Stats `agentCost`, `agentTokens` |
| Cost & token trends over time | cost line; tokens in / out / total | Trends `series.cost`, `tokensIn`, `tokensOut`, `tokensTotal` |
| Platform summary, Agent utilization, MCP tool calls, Top phase latencies, Recent SRs | tables / bars | **Sample** |

### 4.2 Agents

| Section | Data |
|---|---|
| Agent invocation trend | Trends `grouped.invocations` |
| Token usage trend | Trends `grouped.agentTokens` |
| Invocation status, Aggregate stats, LLM / MCP latency trend, Agent capability radar, Agent details | **Sample** |

### 4.3 Models

| Section | Data |
|---|---|
| KPIs: LLM calls, input tokens, total tokens, model count, cost | Stats `llm`, `modelCalls`, `totals` |
| Token usage by model over time | Trends `grouped.modelTokens` |
| Model call trend | Trends `grouped.modelCalls` |
| Calls by model (donut) | Stats `modelCalls` COUNT |
| Cost distribution (donut) | Stats `modelCost` SUM(cost) |
| Latency by model (avg + p90) | Stats `modelCost` AVG(u_duration) + Trends `modelP90` |
| Callers per model, Model details | **Sample** |

### 4.4 MCP Tools

| Section | Data |
|---|---|
| MCP call volume trend | Trends `series.mcpCalls` (the "Errors" series is hidden in live mode) |
| Tool volume share | Stats `tools` |
| Tool performance | Stats `tools` (calls only; avg / p90 / error rate hidden in live mode) |
| Agent × tool call matrix (heatmap, top 10 tools) | Stats `matrix` |

### 4.5 FinOps

| Section | Data |
|---|---|
| Total LLM spend (KPI) | Stats `totals` SUM(cost) |
| Cost by agent | Stats `agentCost` |
| Cost by model | Stats `modelCost` |
| MCP tool call volume | Stats `tools` |
| Cost consumption over time | Trends `series.costConsumption` |
| Token consumption over time | Trends `series.tokensIn`, `series.tokensOut` |
| Model cost breakdown | **Sample** |

### 4.6 LLM Traces

| Section | Data |
|---|---|
| KPIs: total LLM cost, LLM call spans, avg p90 latency, models active | Stats `totals`, `llm`, `modelCalls` + Trends `modelP90` |
| Top SRs by cost | Stats `srs` SUM(cost), `srCalls` |
| P90 latency by model | Trends `modelP90` |
| LLM call spans (table) | Trends `recentLlmSpans` |

### 4.7 Exec View

| Section | Data |
|---|---|
| KPIs: total cost, total calls, successful SRs %, error rate % | Stats `totals` SUM(cost), `llm` COUNT, `outcomes` |
| Token usage | Trends `series.tokensIn`, `series.tokensOut` |
| P90 latency (ms): p90 + avg per model | Trends `modelP90` + Stats `modelCost` AVG(u_duration) |
| Cost by model, Model distribution by calls | Stats `modelCost`, `modelCalls` |
| Top service requests by cost | Stats `srs` |
| Cost by agent | Stats `agentCost` |

### 4.8 Performance

| Section | Data |
|---|---|
| KPI: average latency (p90) | mean of Trends `modelP90` |
| KPI: total LLM calls | Stats `llm` COUNT |
| KPIs: total errors, error rate | Stats `outcomes`: failed SRs, and failed / total SRs |
| LLM calls per model | Trends `grouped.modelCalls` |
| Throughput | Trends `series.activity` |
| Error rate by agent | Stats `agentCalls` / `agentFailed` |
| Model usage by token count (donut) | Stats `modelCalls` SUM(input_tokens) + SUM(output_tokens) |
| Agent activity over time | Trends `grouped.invocations` |

### 4.9 SR Lookup and SR detail

| View | Data |
|---|---|
| SR Lookup table: SR, Date | Stats `srs` (SR list) + Trends `srs` (first-seen time) |
| SR Lookup table: In tok, Out tok, Cost | Stats `srs` SUM(input_tokens, output_tokens, cost) |
| SR Lookup table: Duration, Agents, Steps, Tools, A2A | no live source; shows "—" |
| SR detail page (`/extended-observability/sr/:srNumber`) | `loadLiveSr()`: Stats on `u_sr_number=<SR>` (COUNT = events, SUM tokens and cost), plus the Table API `/api/now/table/sn_ai_observe_ai_span` for the earliest span (start time) and the latest span with `u_sr_outcome` (outcome). Agents, steps, tools, A2A and total time show "—" (no source) |

---

## 5. Verify

1. `pnpm lint` has no errors. `pnpm build` succeeds, and the build output contains the REST API (`sys_ws_definition`).
2. Local preview: open `/extended-observability`.
   - KPIs and group-by charts appear first. Trend charts show a placeholder until Trends returns
     (about 10 s), then render.
   - Network tab: about 14 `/api/now/stats/sn_ai_observe_ai_span` requests plus **one**
     `/api/{{SCOPE}}/observability/trends` per load. They are **not** repeated every few seconds. A
     repeating burst means the reload guard (spec 1 §3.4) was changed.
   - Console: no `[observability] live data failed`. A failure names the source. Check the
     prerequisites (§1) for that source's fields.
   - Switching range starts exactly one new load. Returning to a range within 5 minutes uses the cache.
     Refresh bypasses the cache.
   - SR Lookup lists live SR numbers, and an SR opens with live totals.
3. Deploy as in spec 1 §7. Allow for the instance's code-serving delay.
