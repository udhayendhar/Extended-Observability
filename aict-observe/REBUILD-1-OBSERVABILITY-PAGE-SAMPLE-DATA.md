# Rebuild spec 1 — Extended Observability page (sample data)

**For the coding agent.** Build this page exactly as specified, in one pass. Every source file
is given below in full. **Create each file with exactly the content shown.** Only replace the
three placeholders (see §2). Do not refactor, rename, "simplify" or reformat the code. The
rules in §3 explain why some code looks the way it does; it was fixed after real failures.

The result is a 9-tab observability dashboard for a KYC agent platform. It renders entirely
from a built-in, deterministic sample dataset. It makes **no** requests to the instance. A
second spec (`REBUILD-2-OBSERVABILITY-LIVE-DATA.md`) later switches it to live data by
replacing a few files.

---

## 1. What the page is

- **Route:** `/extended-observability` (dashboard) and `/extended-observability/sr/:srNumber` (SR detail).
- **Header:** title **"Extended Observability"**, subtitle **"Monitor health, cost and performance"**,
  time-range buttons `1h 6h 24h 2d 7d 15d 30d All` (default **15d**), a **Refresh** button and an
  "Updated hh:mm" status. **No** "Live data" / "Sample data" badges or warnings anywhere.
- **Tabs (in this order):** Overview · Agents · Models · MCP Tools · FinOps · LLM Traces · Exec View ·
  Performance · SR Lookup. Only the active tab renders.
- **URL state:** the selected tab and range are kept in the query string, e.g.
  `/extended-observability?tab=models&range=7d` (shallow, replace navigation).
- **SR Lookup tab:** a searchable SR table. Clicking an SR opens the SR detail page, which shows
  KPI tiles for that SR and a "Back to SR lookup" link.
- **Charts:** platform components `<aiux-visualizations-axis>` (line, spline, column, bar, area, heatmap)
  and `<aiux-visualizations-composition>` (donut, pie, radar), with data in the platform's
  `{metadata, data}` response shape built by `viz.js`.

---

## 2. Placeholders: replace before saving each file

| Placeholder | Replace with | Example |
|---|---|---|
| `{{TAG_PREFIX}}` | The new app's custom-element tag prefix: its **scope name with `_` replaced by `-`** | scope `x_acce9_obs_app` → `x-acce9-obs-app` |
| `{{SCOPE}}` | The new app's scope name (used only in spec 2) | `x_acce9_obs_app` |
| `{{APP_NAME}}` | The app's display name (used in the browser tab title) | `Extended Observability` |

Element tags must start with the scope-derived prefix and be **unique**. Never reuse a tag that
was used before on the same instance (see §3.2).

---

## 3. Rules (do not skip)

1. **Build it as a normal page of the app** under `pages/`. **Do not** build it as an extension page of
   another experience (`src/extensions/<experience>/pages/...`). As an extension page inside the AICT
   experience, the page received no `loaderData`. Tab and range became `undefined` and the page hung on
   its loading skeleton, even with sample data. The identical page in the app's own `pages/` works.
2. **Use fresh tags and a fresh route** on an instance that ran an earlier version of this page. The
   instance has served previously compiled code for reused tag/path records for hours after an install.
3. **Hydration:** the first browser render must be identical to the server render (header with an
   empty status line plus a skeleton). That's why `_setRange()` in `dashboard.js` and `_load()` in
   `sr-detail.js` wait for `this.updateComplete` before setting data. Do **not** set `_data`, `_loading`
   or `_sr` synchronously inside `willUpdate()`. Doing so caused "Hydration Mismatch" and a blank page.
4. **Do not restart loads.** `willUpdate()` only calls `_setRange()` for a new range, or when nothing is
   loaded and nothing is loading. `disconnectedCallback()` cancels a load only if the element stays
   detached for 2 s. Removing either guard caused an endless reload loop.
5. **Loader fallback:** if `loaderData` is missing, the page reads `tab`/`range` (and the SR number) from
   `window.location`. Keep it.
6. **All user-visible strings** go through `i18n.getMessage()` (already done in the code).
7. **Page class pattern:** `page.js` exports a class that extends `withObservabilityDashboard(AIUXElement)`
   and declares its own `static async loader(ctx) { return super.loader(ctx); }`. The SDK only
   registers a route for a `page.js` whose class extends `AIUXElement` (directly or via a mixin) and has
   a static `loader`.
8. **Per-page switches** (static fields on the page classes):
   - `liveData`: `false` = sample data only (this spec); `true` = load from the instance (spec 2).
   - `showDataSource`: `false` hides every data-source badge and notice. Keep it `false`.
   - `heading` / `subheading`: static getters returning translated text.

---

## 4. App setup

1. Create a new **AIUX application** with the ServiceNow SDK (`now-sdk init`, AIUX template), on the
   **target instance's own vendor prefix**. An app whose scope prefix differs from the instance's
   company code (`glide.appcreator.company.code`) is "third party", and `now-sdk install` refuses it.
2. Dependencies, as in the working app: `@servicenow/aiux` (latest), `lit` `^3.2.1`,
   `@servicenow/sdk` `4.13.6`, Node `>=24.14.1`, pnpm. Use the scaffolded `aiux.json`,
   `now.config.json`, `theme.js` and ESLint config as generated. **Never hand-edit
   `src/fluent/generated/keys.ts`**; the build maintains it.
3. `application.js` must use the platform shell (`applicationLayout: 'aiux-nav-layout'`). Add this
   nav item to the `items` array in `setup()`:

```js
{
  icon: 'activity',
  title: i18n.getMessage('Extended Observability'),
  action: {type: 'navigate', path: '/extended-observability'}
}
```

4. No app-level CSS is needed. The page only uses platform Tailwind/DaisyUI classes (`aiux-*`,
   `text-text-primary` and so on).

---

## 5. File tree

```
utils/document-title.js
pages/extended-observability/page.js                      ← route /extended-observability
pages/extended-observability/sr/[srNumber]/page.js        ← route /extended-observability/sr/:srNumber
pages/extended-observability/dashboard.js                 ← dashboard mixin (header, range, tabs, loading)
pages/extended-observability/sr-detail.js                 ← SR detail mixin
pages/extended-observability/sample-data.js               ← deterministic sample dataset + RANGES
pages/extended-observability/live-shape.js                ← sampleAsLive(): sample → data.live shape
pages/extended-observability/live-data.js                 ← sample-mode stub (spec 2 replaces it)
pages/extended-observability/viz.js                       ← chart data builders + locale formatters
pages/extended-observability/components/ui.js             ← section/card/KPI/bar-list/table helpers
pages/extended-observability/components/obs-data-table.js ← sortable table element
pages/extended-observability/components/obs-sr-lookup.js  ← SR lookup element
pages/extended-observability/tabs/*.js                    ← one renderer per tab + chart-helpers.js
```

Only `page.js` files become routes. Every other file under `pages/extended-observability/` is a plain module.

---

## 6. Source files

### 6.1 Pages

#### `pages/extended-observability/page.js`

```js
import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import {withObservabilityDashboard} from './dashboard.js';

/** Extended Observability dashboard (sample data). */
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

  static liveData = false;

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

/** SR detail for Extended Observability (sample data). */
@customElement('{{TAG_PREFIX}}-extended-obs-sr-page')
export default class ExtendedObservabilitySrPage extends withObservabilitySrDetail(AIUXElement) {
  static basePath = '/extended-observability';

  static showDataSource = false;

  static liveData = false;

  static async loader(ctx) {
    return super.loader(ctx);
  }
}
```

### 6.2 Utility

#### `utils/document-title.js`

```js
import {isServer} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';

/** Sets the browser tab title for the current page (WCAG 2.4.2). */
export function setDocumentTitle(pageTitle) {
  if (isServer) return;
  document.title = i18n.getMessage('{0} | {1}', [
    pageTitle,
    i18n.getMessage('{{APP_NAME}}')
  ]);
}
```

### 6.3 Data shape and sample-mode data layer

#### `pages/extended-observability/live-shape.js`

```js
/**
 * The dashboard's data shape (`data.live`) built from the sample dataset.
 * Every tab reads `data.live`; in sample mode it comes only from here.
 */
export function sampleAsLive(d) {
  const k = d.kpis;
  const llmAgents = d.agents.filter(a => a.llmCalls > 0);
  const named = obj =>
    Object.entries(obj).map(([key, values], n) => ({key: `s${n}`, label: key, values}));
  return {
    source: 'sample',
    range: d.range,
    bucketMinutes: d.bucketMinutes,
    buckets: d.buckets,
    failed: [],
    kpis: {
      totalSrs: k.totalSrs,
      approved: k.approved,
      failed: k.failed,
      avgDurationMs: k.avgDurationMs,
      p95DurationMs: k.p95DurationMs,
      avgP90Ms: k.avgP90Ms,
      llmCalls: k.llmCalls,
      llmAgents: k.llmAgents,
      avgCost: k.cost / Math.max(1, k.llmCalls),
      cost: k.cost,
      tokensIn: k.tokensIn,
      tokensOut: k.tokensOut,
      totalTokens: k.tokensIn + k.tokensOut,
      spans: null
    },
    outcomes: [
      {id: 'approved', label: null, value: k.approved},
      {id: 'failed', label: null, value: k.failed},
      {id: 'in_progress', label: null, value: k.inProgress}
    ],
    agentCosts: llmAgents.map(a => ({id: a.key, label: a.name, value: a.cost})),
    agentTokens: llmAgents.map(a => ({id: a.key, label: a.name, value: a.tokens})),
    agentAvgTokens: llmAgents.map(a => ({
      id: a.key,
      label: a.name,
      value: Math.round(a.tokens / Math.max(1, a.llmCalls))
    })),
    agentErrors: d.agents.map(a => ({id: a.key, label: a.name, calls: a.srs, failed: a.failed, errRate: a.errRate})),
    models: d.models.map(m => ({
      id: m.id,
      calls: m.calls,
      cost: m.cost,
      avgMs: m.avgMs,
      p90Ms: m.p90Ms,
      tokensIn: m.tokensIn,
      tokensOut: m.tokensOut,
      tokens: m.tokensIn + m.tokensOut
    })),
    tools: d.tools.map(tool => ({id: tool.id, label: tool.id, calls: tool.calls})),
    matrix: d.matrix,
    srs: d.srs,
    spans: d.spans.map(span => ({...span, agent: span.agent ? (d.agents.find(a => a.key === span.agent)?.name ?? span.agent) : null})),
    series: {
      activity: d.series.srTotal,
      failed: d.series.srFailed,
      cost: d.series.cost,
      costConsumption: d.series.cost,
      tokensIn: d.series.tokensIn,
      tokensOut: d.series.tokensOut,
      tokensTotal: d.series.tokensIn.map((v, i) => v + d.series.tokensOut[i]),
      invocations: named(d.series.invocations),
      agentTokens: named(d.series.tokens),
      modelTokens: d.models.map((m, n) => ({key: `s${n}`, label: m.id, values: d.series.modelTokens[m.id]})),
      modelCalls: d.models.map((m, n) => ({key: `s${n}`, label: m.id, values: d.series.modelCalls[m.id]})),
      mcpCalls: d.series.mcpCalls
    }
  };
}
```

#### `pages/extended-observability/live-data.js`

```js
/**
 * Sample-data build: no instance requests. The live-data spec
 * (REBUILD-2-OBSERVABILITY-LIVE-DATA.md) replaces this file.
 */
export {sampleAsLive} from './live-shape.js';

/** Sample mode never loads live data. */
export async function loadLiveData() {
  return null;
}

/** Sample mode never loads a live SR. */
export async function loadLiveSr() {
  return null;
}
```

### 6.4 Dashboard, SR detail, sample data, charts, components and tabs

#### `pages/extended-observability/dashboard.js`

```js
import {html, css, nothing, isServer} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import {navigate} from '@servicenow/aiux/aiux-client';
import '@servicenow/aiux/aiux-components-tabs';
import {setDocumentTitle} from '../../utils/document-title.js';
import {RANGES, DEFAULT_RANGE, buildObservabilityData} from './sample-data.js';
import {getLogger} from '@servicenow/aiux/aiux-components-core';
import {loadLiveData, sampleAsLive} from './live-data.js';
import {resolveLocale, fmtTime} from './viz.js';
import {renderOverview} from './tabs/overview.js';
import {renderAgents} from './tabs/agents.js';
import {renderModels} from './tabs/models.js';
import {renderMcpTools} from './tabs/mcp-tools.js';
import {renderFinOps} from './tabs/finops.js';
import {renderLlmTraces} from './tabs/llm-traces.js';
import {renderExecView} from './tabs/exec-view.js';
import {renderPerformance} from './tabs/performance.js';
import {renderSrLookup} from './tabs/sr-lookup.js';

const TABS = [
  {id: 'overview', label: () => i18n.getMessage('Overview'), render: renderOverview},
  {id: 'agents', label: () => i18n.getMessage('Agents'), render: renderAgents},
  {id: 'models', label: () => i18n.getMessage('Models'), render: renderModels},
  {id: 'mcp-tools', label: () => i18n.getMessage('MCP Tools'), render: renderMcpTools},
  {id: 'finops', label: () => i18n.getMessage('FinOps'), render: renderFinOps},
  {id: 'llm-traces', label: () => i18n.getMessage('LLM Traces'), render: renderLlmTraces},
  {id: 'exec-view', label: () => i18n.getMessage('Exec View'), render: renderExecView},
  {id: 'performance', label: () => i18n.getMessage('Performance'), render: renderPerformance},
  {id: 'sr-lookup', label: () => i18n.getMessage('SR Lookup'), render: renderSrLookup}
];

/**
 * Completed live datasets per range, kept for the browser session so switching
 * back to a range (or returning to the page) doesn't reload it. Refresh
 * bypasses the cache.
 */
const rangeCache = new Map();

const log = getLogger('{{TAG_PREFIX}}-obs-dashboard-page');

/** Last path segment, for links relative to the current page URL. */
export const lastSegment = path => path.split('/').pop();
const CACHE_MS = 5 * 60 * 1000;

/**
 * Observability dashboard. Applied to AIUXElement by the page class (the SDK
 * only treats a page.js whose class extends AIUXElement, directly or via a
 * mixin, as a route); the page sets `basePath` to its own route.
 */
export const withObservabilityDashboard = Base => class ObservabilityDashboard extends Base {
  /** Route of the page that renders this dashboard; SR links live under it. */
  static basePath = '/extended-observability';

  /** Page heading; also the document title. */
  static get heading() {
    return i18n.getMessage('Platform Observability');
  }

  static get subheading() {
    return i18n.getMessage('KYC agent platform health, cost and performance');
  }

  /** Show the live/sample data badge and the sample-data fallback notices. */
  static showDataSource = true;

  /** Load live data from the instance; false renders the sample dataset only. */
  static liveData = true;

  static properties = {
    _tab: {state: true},
    _range: {state: true},
    _data: {state: true},
    _loading: {state: true},
    _refreshedAt: {state: true}
  };

  static styles = css`
    :host {
      display: block;
      min-height: 100%;
      container-type: inline-size;
    }
  `;

  static async loader(ctx) {
    const tab = TABS.some(t => t.id === ctx.query?.tab) ? ctx.query.tab : 'overview';
    const range = RANGES.some(r => r.id === ctx.query?.range) ? ctx.query.range : DEFAULT_RANGE;
    return {tab, range};
  }

  // loaderData is a getter (not a reactive property), so detect new loader
  // results by identity rather than through `changed`.
  _seenLoaderData = null;

  /**
   * Tab and range from the browser URL. Fallback for when the host doesn't
   * hand the page its loader result.
   */
  static _fromUrl() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const range = params.get('range');
    return {
      tab: TABS.some(t => t.id === tab) ? tab : 'overview',
      range: RANGES.some(r => r.id === range) ? range : DEFAULT_RANGE
    };
  }

  willUpdate() {
    let data = this.loaderData;
    if (!data && !isServer && !this._seenLoaderData) data = this.constructor._fromUrl();
    if (data && data !== this._seenLoaderData) {
      this._seenLoaderData = data;
      this._tab = data.tab;
      // Live data only loads in the browser. On the server, render the
      // header and skeleton without starting a load.
      if (isServer) {
        this._range = data.range;
        return;
      }
      // The host can hand over the same loader result again (e.g. on a shallow
      // URL update). Only start a load for a new range, or when nothing has
      // loaded and nothing is loading; restarting would cancel the load in
      // progress, and the page would never finish.
      if (data.range !== this._range || (!this._data && !this._abort)) {
        this._setRange(data.range);
      }
    }
  }

  firstUpdated() {
    setDocumentTitle(this.constructor.heading);
  }

  _loadId = 0;
  /** AbortController of the load in flight, if any. */
  _abort = null;
  _interrupted = false;

  /**
   * The sample dataset fixes the range and time buckets; widgets listed in
   * IDB_DASHBOARD_WIDGETS.md read `data.live`, loaded from the instance.
   * Sections without a configured source keep using the sample dataset.
   */
  async _setRange(range, {force = false} = {}) {
    this._range = range;
    // Cancel the previous load so it stops using the instance's request slots.
    this._abort?.abort();
    this._abort = null;
    const id = ++this._loadId;
    // Change nothing else until the first render is done: the first client
    // render must match the server's skeleton (empty status, no data), or
    // hydration fails and the page stays on the skeleton.
    if (!this.hasUpdated) {
      await this.updateComplete;
      if (id !== this._loadId) return;
    }

    const cached = !force && rangeCache.get(range);
    if (cached && Date.now() - cached.at.getTime() < CACHE_MS) {
      this._data = cached.data;
      this._refreshedAt = cached.at;
      this._loading = false;
      return;
    }

    const now = new Date();
    const sample = buildObservabilityData(range, now);
    if (!this.constructor.liveData) {
      this._data = {...sample, live: sampleAsLive(sample)};
      this._refreshedAt = now;
      this._loading = false;
      return;
    }
    const abort = new AbortController();
    this._abort = abort;
    this._loading = true;
    let live = null;
    try {
      live = await loadLiveData(sample, {
        now,
        signal: abort.signal,
        // Render KPIs and group-by charts while the trend rows load.
        onSummary: summary => {
          if (id === this._loadId) this._data = {...sample, live: summary};
        }
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- surface the cause in the browser console
      console.error('[observability] live data failed', error);
      log.error({error}, 'Live observability data failed');
      live = null;
    }
    // A newer range or refresh started, or the page was disconnected.
    if (id !== this._loadId || abort.signal.aborted) return;
    this._abort = null;
    this._data = {...sample, live: live ?? {...sampleAsLive(sample), unavailable: true}};
    this._refreshedAt = now;
    this._loading = false;
    if (live) rangeCache.set(range, {data: this._data, at: now});
  }

  connectedCallback() {
    super.connectedCallback();
    // Reattached before the pending cancel: keep the load running.
    clearTimeout(this._disconnectTimer);
    // Resume a load that was cancelled when the page was disconnected.
    if (this._interrupted) {
      this._interrupted = false;
      this._setRange(this._range);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // The host may detach and reattach the page (e.g. when its layout
    // re-renders). Cancel the load only if the page stays detached.
    clearTimeout(this._disconnectTimer);
    this._disconnectTimer = setTimeout(() => {
      if (this.isConnected || !this._abort) return;
      this._abort.abort();
      this._abort = null;
      this._interrupted = true;
    }, 2000);
  }

  _syncUrl() {
    navigate(this.constructor.basePath, {
      shallow: true,
      replace: true,
      query: {tab: this._tab, range: this._range}
    });
  }

  _onTabChange = e => {
    this._tab = e.detail.id;
    this._syncUrl();
  };

  _onRangeClick = e => {
    const range = e.currentTarget.dataset.range;
    if (range === this._range) return;
    this._setRange(range);
    this._syncUrl();
  };

  _onRefresh = () => {
    this._setRange(this._range, {force: true});
  };

  _openSr = number => {
    navigate(`${this.constructor.basePath}/sr/${encodeURIComponent(number)}`, {query: {range: this._range}});
  };

  _onSrLinkClick = e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    this._openSr(e.currentTarget.dataset.sr);
  };

  _srLink = number => html`
    <a
      class="aiux-link aiux-link-primary font-mono text-sm"
      href="./${lastSegment(this.constructor.basePath)}/sr/${encodeURIComponent(number)}?range=${this._range}"
      data-sr=${number}
      @click=${this._onSrLinkClick}
    >${number}</a>
  `;

  _renderSourceBadge() {
    const live = this._data?.live;
    if (!live || !this.constructor.showDataSource) return nothing;
    return live.source === 'live'
      ? html`<span class="aiux-badge aiux-badge-info aiux-badge-soft aiux-badge-sm">
          ${i18n.getMessage('Live data · some sections sample')}
        </span>`
      : html`<span class="aiux-badge aiux-badge-warning aiux-badge-soft aiux-badge-sm">
          ${i18n.getMessage('Sample data')}
        </span>`;
  }

  _renderNotice() {
    const live = this._data?.live;
    if (!live || !this.constructor.showDataSource) return nothing;
    if (live.unavailable) {
      return html`<div class="aiux-alert aiux-alert-warning aiux-alert-soft" role="alert">
        ${i18n.getMessage('Live observability data could not be loaded. Showing sample data.')}
      </div>`;
    }
    if (live.failed?.length) {
      return html`<div class="aiux-alert aiux-alert-warning aiux-alert-soft" role="status">
        ${i18n.getMessage('Some live queries failed ({0}); those charts show sample data.', [
          live.failed.join(', ')
        ])}
      </div>`;
    }
    return nothing;
  }

  _renderHeader(locale) {
    return html`
      <header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold tracking-tight text-text-primary">
              ${this.constructor.heading}
            </h1>
            ${this._renderSourceBadge()}
          </div>
          <p class="text-sm text-text-secondary">
            ${this.constructor.subheading}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="aiux-join" role="group" aria-label=${i18n.getMessage('Time range')}>
            ${RANGES.map(
              r => html`
                <button
                  type="button"
                  class="aiux-btn aiux-btn-sm aiux-join-item font-mono ${r.id === this._range
                    ? 'aiux-btn-primary'
                    : 'aiux-btn-ghost'}"
                  aria-pressed=${r.id === this._range ? 'true' : 'false'}
                  data-range=${r.id}
                  @click=${this._onRangeClick}
                >
                  ${r.hours == null ? i18n.getMessage('All') : r.id}
                </button>
              `
            )}
          </div>
          <button
            type="button"
            class="aiux-btn aiux-btn-sm aiux-btn-outline"
            ?disabled=${this._loading}
            @click=${this._onRefresh}
          >
            ${i18n.getMessage('Refresh')}
          </button>
          <span class="font-mono text-xs text-text-secondary" role="status">
            ${this._loading
              ? i18n.getMessage('Loading…')
              : this._refreshedAt
                ? i18n.getMessage('Updated {0}', [fmtTime(this._refreshedAt, locale)])
                : nothing}
          </span>
        </div>
      </header>
    `;
  }

  render() {
    const locale = resolveLocale();
    if (!this._data) {
      return html`
        <div class="mx-auto flex max-w-screen-2xl flex-col gap-4 p-4 lg:p-8">
          ${this._renderHeader(locale)}
          <div class="flex flex-col gap-6 pt-6" role="status">
            <span class="sr-only">${i18n.getMessage('Loading observability data…')}</span>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" aria-hidden="true">
              ${Array.from({length: 6}, () => html`<div class="aiux-skeleton h-24 w-full"></div>`)}
            </div>
            <div class="aiux-skeleton h-72 w-full" aria-hidden="true"></div>
          </div>
        </div>
      `;
    }
    const ctx = {locale, srLink: this._srLink, openSr: this._openSr};
    const tabs = TABS.map(t => ({
      id: t.id,
      label: t.label(),
      // Only the active tab renders content, so hidden tabs don't build charts.
      content:
        t.id === this._tab
          ? html`<div class="flex flex-col gap-6 pt-6">${t.render(this._data, ctx)}</div>`
          : undefined
    }));

    return html`
      <div class="mx-auto flex max-w-screen-2xl flex-col gap-4 p-4 lg:p-8">
        ${this._renderHeader(locale)}
        ${this._renderNotice()}
        <aiux-tab-group
          .tabs=${tabs}
          .activeTab=${this._tab}
          size="sm"
          tablist-label=${i18n.getMessage('Observability sections')}
          @aiux-tab-group:tab-change=${this._onTabChange}
        ></aiux-tab-group>
      </div>
    `;
  }
};
```

#### `pages/extended-observability/sr-detail.js`

```js
import {html, css, nothing, isServer} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import {navigate} from '@servicenow/aiux/aiux-client';
import '@servicenow/aiux/aiux-components-empty-state-content';
import {setDocumentTitle} from '../../utils/document-title.js';
import {RANGES, DEFAULT_RANGE, findSampleSr} from './sample-data.js';
import {loadLiveSr} from './live-data.js';
import {
  resolveLocale,
  fmtNumber,
  fmtCompact,
  fmtCost,
  fmtDuration,
  fmtDateTime
} from './viz.js';
import {kpiRow, outcomeBadge} from './components/ui.js';
import {outcomeLabels} from './tabs/chart-helpers.js';

/** Last path segment, for links relative to the current page URL. */
const lastSegment = path => path.split('/').pop();

/**
 * Minimal SR detail for the observability dashboard. Reads the SR's spans
 * from the AI span table; SR numbers that only exist in the sample dataset
 * (sections without a configured source) fall back to sample values. The
 * full lineage drill-down is planned as a follow-up.
 */
export const withObservabilitySrDetail = Base => class ObservabilitySrDetail extends Base {
  /** Route of the dashboard this SR page belongs to. */
  static basePath = '/extended-observability';

  /** Show the "Sample data" badge when the SR comes from the sample dataset. */
  static showDataSource = true;

  /** Read the SR from the instance; false uses the sample dataset only. */
  static liveData = true;

  static properties = {
    _sr: {state: true},
    _source: {state: true},
    _loading: {state: true}
  };

  static styles = css`
    :host {
      display: block;
    }
  `;

  static async loader(ctx) {
    const srNumber = decodeURIComponent(ctx.params?.srNumber ?? '');
    const range = RANGES.some(r => r.id === ctx.query?.range) ? ctx.query.range : DEFAULT_RANGE;
    return {srNumber, range};
  }

  _seenLoaderData = null;
  _loadId = 0;

  /**
   * SR number and range from the browser URL. Fallback for when the host
   * doesn't hand the page its loader result.
   */
  static _fromUrl() {
    const match = window.location.pathname.match(/\/sr\/([^/]+)\/?$/);
    const range = new URLSearchParams(window.location.search).get('range');
    return {
      srNumber: match ? decodeURIComponent(match[1]) : '',
      range: RANGES.some(r => r.id === range) ? range : DEFAULT_RANGE
    };
  }

  get _routeData() {
    if (!this._urlData && !isServer && !this.loaderData) this._urlData = this.constructor._fromUrl();
    return this.loaderData ?? this._urlData;
  }

  willUpdate() {
    const data = this._routeData;
    if (data && data !== this._seenLoaderData) {
      this._seenLoaderData = data;
      this._load(data.srNumber, data.range);
    }
  }

  firstUpdated() {
    setDocumentTitle(this._routeData?.srNumber || i18n.getMessage('Service request'));
  }

  async _load(srNumber, range) {
    const id = ++this._loadId;
    this._loading = true;
    let sr = null;
    if (this.constructor.liveData) {
      try {
        sr = await loadLiveSr(srNumber);
      } catch {
        sr = null;
      }
    } else {
      // Fill in after the current render so the first client render matches
      // the server's skeleton.
      await this.updateComplete;
    }
    if (id !== this._loadId) return;
    const sample = sr ? null : srNumber ? findSampleSr(srNumber, range) : null;
    this._sr = sr ?? sample;
    this._source = sr ? 'live' : 'sample';
    this._loading = false;
  }

  _back = e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(this.constructor.basePath, {query: {tab: 'sr-lookup', range: this._routeData?.range}});
  };

  render() {
    const {srNumber, range} = this._routeData || {};
    const locale = resolveLocale();
    const sr = this._sr;
    const opt = (v, fmt) => (v == null ? '—' : fmt(v));

    const back = html`
      <a
        class="aiux-link aiux-link-primary text-sm"
        href="../../${lastSegment(this.constructor.basePath)}?tab=sr-lookup&range=${range ?? DEFAULT_RANGE}"
        @click=${this._back}
      >
        ← ${i18n.getMessage('Back to SR lookup')}
      </a>
    `;

    if (this._loading && !sr) {
      return html`
        <div class="mx-auto flex max-w-5xl flex-col gap-4 p-4 lg:p-8">
          ${back}
          <div class="flex flex-col gap-6" role="status">
            <span class="sr-only">${i18n.getMessage('Loading {0}…', [srNumber ?? ''])}</span>
            <div class="aiux-skeleton h-8 w-64" aria-hidden="true"></div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
              ${Array.from({length: 8}, () => html`<div class="aiux-skeleton h-24 w-full"></div>`)}
            </div>
          </div>
        </div>
      `;
    }

    if (!sr) {
      return html`
        <div class="mx-auto flex max-w-5xl flex-col gap-4 p-4 lg:p-8">
          ${back}
          <aiux-empty-state-content
            heading-text=${i18n.getMessage('SR not found')}
            body-text=${this.constructor.liveData
              ? i18n.getMessage('{0} has no spans in the AI span table.', [srNumber ?? ''])
              : i18n.getMessage('No data found for {0}.', [srNumber ?? ''])}
          ></aiux-empty-state-content>
        </div>
      `;
    }

    const labels = {...outcomeLabels(), ...(sr.outcomeLabel ? {[sr.outcome]: sr.outcomeLabel} : {})};

    return html`
      <div class="mx-auto flex max-w-screen-2xl flex-col gap-6 p-4 lg:p-8">
        ${back}
        <header class="flex flex-wrap items-center gap-3">
          <h1 class="font-mono text-2xl font-bold text-text-primary break-all">${sr.number}</h1>
          ${sr.outcome ? outcomeBadge(sr.outcome, labels) : nothing}
          ${this._source === 'sample' && this.constructor.showDataSource
            ? html`<span class="aiux-badge aiux-badge-warning aiux-badge-soft aiux-badge-sm">
                ${i18n.getMessage('Sample data')}
              </span>`
            : nothing}
          ${sr.time
            ? html`<span class="text-sm text-text-secondary">${fmtDateTime(sr.time, locale)}</span>`
            : nothing}
        </header>

        ${kpiRow(
          [
            {label: i18n.getMessage('Agents'), value: opt(sr.agents, v => fmtNumber(v, locale))},
            {label: i18n.getMessage('Agent steps'), value: opt(sr.steps, v => fmtNumber(v, locale))},
            {label: i18n.getMessage('Tools'), value: opt(sr.tools, v => fmtNumber(v, locale))},
            {label: i18n.getMessage('A2A'), value: opt(sr.a2a, v => fmtNumber(v, locale))},
            {label: i18n.getMessage('Total time'), value: opt(sr.durationMs, v => fmtDuration(v, locale))},
            {label: i18n.getMessage('Events'), value: fmtNumber(sr.events, locale)},
            {
              label: i18n.getMessage('Tokens'),
              value: fmtCompact(sr.tokensIn + sr.tokensOut, locale),
              sub: i18n.getMessage('In {0} / out {1}', [
                fmtCompact(sr.tokensIn, locale),
                fmtCompact(sr.tokensOut, locale)
              ])
            },
            {label: i18n.getMessage('Cost'), value: fmtCost(sr.cost, locale), tone: 'warning'}
          ],
          'lg:grid-cols-4'
        )}

        <div class="aiux-alert aiux-alert-info aiux-alert-soft" role="note">
          ${i18n.getMessage(
            'The full SR drill-down (call chain, phase timeline, phase durations, business outcomes, LLM calls and event stream) is planned for the next iteration.'
          )}
        </div>
      </div>
    `;
  }
};
```

#### `pages/extended-observability/sample-data.js`

```js
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
```

#### `pages/extended-observability/viz.js`

```js
import {isServer} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';

/**
 * Builders that turn plain arrays into the DataResponse shape consumed by the
 * aiux-visualizations-* components, plus locale-aware value formatters.
 */

// Semantic colors for charts. Chosen for >= 3:1 contrast on a white surface.
export const TONE = {
  success: '#2F9E44',
  error: '#D9363E',
  warning: '#C77700',
  neutral: '#5F6B7A',
  info: '#1C7CB5'
};

// ServiceNow language codes that are not valid BCP 47 tags.
const SN_LOCALE_TO_BCP47 = {pb: 'pt-BR', zt: 'zh-TW', fq: 'fr-CA', zh: 'zh-CN'};

/** User's display locale as a BCP 47 tag; undefined on the server (runtime default). */
export function resolveLocale() {
  if (isServer) return undefined;
  const lang = document.documentElement.lang || navigator.language;
  return SN_LOCALE_TO_BCP47[lang] ?? lang ?? undefined;
}

// --- Column formatting presets (visualization formatting schema) ----------

export const FMT = {
  count: {type: 'number', options: {}},
  compact: {
    type: 'number',
    options: {abbreviationEnabled: true, decimalPrecision: 0}
  },
  cost: {type: 'number', options: {decimalPrecision: 4, unit: '${0}'}},
  ms: {type: 'number', options: {unit: '{0} ms'}},
  percent: {type: 'number', options: {decimalPrecision: 1, unit: '{0}%'}}
};

// --- Low-level DataResponse helpers ----------------------------------------

function dimension(order, items, label, colors) {
  return {
    column: {
      type: 'categorical',
      meaning: 'dimension',
      order,
      label,
      elements: items.map(i => ({id: i.id, label: i.label}))
    },
    rendering: {
      role: 'grouping',
      presentation: {visualizationDefinition: {}},
      formatting: {type: 'string'},
      // Categorical rules pin a color to a specific element (slice/series).
      rules: colors
        ? Object.entries(colors).map(([id, color]) => ({
            operator: 'equal',
            operand: id,
            applies: {color}
          }))
        : []
    }
  };
}

function metric(order, groupedBy, label, formatting = FMT.count, rules = []) {
  return {
    column: {
      type: 'numerical',
      meaning: 'metric',
      order,
      dataShape: 'single',
      groupedBy,
      label
    },
    rendering: {
      role: 'value',
      presentation: {visualizationDefinition: {}},
      formatting,
      rules
    }
  };
}

/**
 * Every column gets a complete rendering entry: the visualization merge layer
 * only fills defaults for columns with no entry, and a partial entry crashes
 * some components (see aiux-visualizations-score determineFormat).
 */
function response(cols, data) {
  const columns = {};
  const rendering = {};
  for (const [key, c] of Object.entries(cols)) {
    columns[key] = c.column;
    rendering[key] = c.rendering;
  }
  return {metadata: {columns}, data, rendering: {columns: rendering}, interactions: {}};
}

// --- Public builders ---------------------------------------------------------

/**
 * One dimension, one metric: pie/donut slices or a single-series bar chart.
 * @param {{id: string, label: string, value: number}[]} items
 */
export function categoryData(items, {dimLabel, valueLabel, format, colors, rules} = {}) {
  return response(
    {
      key: dimension(0, items, dimLabel ?? '', colors),
      value: metric(1, ['key'], valueLabel ?? i18n.getMessage('Value'), format, rules)
    },
    items.map(i => [i.id, String(i.value)])
  );
}

/**
 * One dimension on the x axis and several metric series (trend lines,
 * grouped bars). `series[].values[i]` lines up with `categories[i]`.
 */
export function seriesData(categories, series, {dimLabel, format} = {}) {
  const cols = {x: dimension(0, categories, dimLabel ?? '')};
  series.forEach((s, n) => {
    cols[s.key] = metric(n + 1, ['x'], s.label, s.format ?? format);
  });
  const rows = categories.map((c, i) => [
    c.id,
    ...series.map(s => String(s.values[i] ?? 0))
  ]);
  return response(cols, rows);
}

/** Two dimensions and a value: heatmap cells. */
export function matrixData(xItems, yItems, cells, {xLabel, yLabel, valueLabel} = {}) {
  return response(
    {
      x: dimension(0, xItems, xLabel ?? ''),
      y: dimension(1, yItems, yLabel ?? ''),
      value: metric(2, ['x', 'y'], valueLabel ?? i18n.getMessage('Value'))
    },
    cells.map(c => [c.x, c.y, String(c.value)])
  );
}

/** Threshold color rules for a metric (last matching rule wins). */
export function thresholdRules(base, steps) {
  return [
    {applies: {color: base}},
    ...steps.map(([operand, color]) => ({
      operator: 'greater',
      operand: String(operand),
      applies: {color}
    }))
  ];
}

// --- Display formatters (locale-aware) ------------------------------------

export function fmtNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(value);
}

export function fmtCompact(value, locale) {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function fmtCost(value, locale) {
  if (!value) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 0.001 ? 5 : 4,
    maximumFractionDigits: value < 0.001 ? 5 : 4
  }).format(value);
}

export function fmtPercent(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(value / 100);
}

/** Milliseconds as ms / s / min, matching the screenshots (e.g. 1.48s, 4.7m). */
export function fmtDuration(ms, locale) {
  const nf = digits =>
    new Intl.NumberFormat(locale, {maximumFractionDigits: digits, minimumFractionDigits: digits});
  if (ms < 1000) return i18n.getMessage('{0}ms', [nf(0).format(ms)]);
  if (ms < 60000) return i18n.getMessage('{0}s', [nf(2).format(ms / 1000)]);
  return i18n.getMessage('{0}m', [nf(1).format(ms / 60000)]);
}

export function fmtDateTime(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function fmtTime(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}
```

#### `pages/extended-observability/components/ui.js`

```js
import {html, nothing} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {repeat} from 'lit/directives/repeat.js';
import {styleMap} from 'lit/directives/style-map.js';

/**
 * Small template helpers shared by the observability tabs. They return Lit
 * templates (not elements) so each tab stays a plain render function.
 */

const TONE_TEXT = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  primary: 'text-primary'
};

/** Titled region: h2 + optional subtitle, labelled for screen readers. */
export function section(id, title, subtitle, body, extraClass = '') {
  return html`
    <section class="flex min-w-0 flex-col gap-3 ${extraClass}" aria-labelledby="${id}-title">
      <div>
        <h2 id="${id}-title" class="text-sm font-semibold uppercase tracking-wide text-text-primary">
          ${title}
        </h2>
        ${subtitle
          ? html`<p class="text-sm text-text-secondary break-words">${subtitle}</p>`
          : nothing}
      </div>
      ${body}
    </section>
  `;
}

export function card(body, extraClass = '') {
  return html`
    <div class="aiux-card min-w-0 border border-base-300 bg-base-100 shadow-sm ${extraClass}">
      <div class="aiux-card-body gap-3 p-4">${body}</div>
    </div>
  `;
}

/** Fixed-height box for a chart so Highcharts has a size to fill. */
export function chartBox(chart, heightClass = 'h-72') {
  return html`<div class="${heightClass} w-full min-w-0">${chart}</div>`;
}

/** KPI tile: label, large value, optional caption. Tone colors the value only. */
export function kpi({label, value, sub, tone}) {
  return html`
    <div class="aiux-card min-w-0 border border-base-300 bg-base-100 shadow-sm">
      <div class="aiux-card-body gap-1 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary break-words">
          ${label}
        </p>
        <p class="font-mono text-2xl font-bold break-words ${classMap({
          [TONE_TEXT[tone] ?? 'text-text-primary']: true
        })}">
          ${value}
        </p>
        ${sub ? html`<p class="text-xs text-text-secondary break-words">${sub}</p>` : nothing}
      </div>
    </div>
  `;
}

export function kpiRow(tiles, cols = 'xl:grid-cols-4') {
  return html`
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 ${cols}">${tiles.map(kpi)}</div>
  `;
}

/**
 * Labelled horizontal bars (agent utilization, tool calls, cost by model).
 * Every bar carries its value as text, so the bar itself is decorative.
 * @param {{id: string, label: string, value: number, text: unknown, note?: unknown, tone?: string}[]} items
 */
export function barList(items, {max, mono = false} = {}) {
  const top = max ?? Math.max(1, ...items.map(i => i.value));
  return html`
    <ul class="flex flex-col gap-3">
      ${repeat(
        items,
        i => i.id,
        i => html`
          <li class="flex flex-col gap-1">
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span class="min-w-0 break-all ${mono ? 'font-mono' : 'font-medium'} text-text-primary">
                ${i.label}
              </span>
              <span class="font-mono text-xs text-text-secondary">
                ${i.text}${i.note
                  ? html` · <span class=${TONE_TEXT[i.tone] ?? ''}>${i.note}</span>`
                  : nothing}
              </span>
            </div>
            <div class="h-2 w-full rounded-full bg-base-200" aria-hidden="true">
              <div
                class="h-2 rounded-full bg-primary forced-colors:bg-[CanvasText]"
                style=${styleMap({width: `${Math.max(1, Math.round((i.value / top) * 100))}%`})}
              ></div>
            </div>
          </li>
        `
      )}
    </ul>
  `;
}

/**
 * Static table. `columns[].render(row)` returns the cell content and
 * `columns[].end` right-aligns numeric columns.
 */
export function table(caption, columns, rows, rowKey) {
  return html`
    <div class="overflow-x-auto">
      <table class="aiux-table aiux-table-sm">
        <caption class="sr-only">${caption}</caption>
        <thead>
          <tr>
            ${columns.map(
              c => html`<th scope="col" class=${c.end ? 'text-end' : ''}>${c.label}</th>`
            )}
          </tr>
        </thead>
        <tbody>
          ${repeat(
            rows,
            rowKey,
            row => html`
              <tr>
                ${columns.map((c, n) =>
                  n === 0
                    ? html`<th scope="row" class="font-medium ${c.end ? 'text-end' : ''}">
                        ${c.render(row)}
                      </th>`
                    : html`<td class="${c.end ? 'text-end font-mono' : ''}">${c.render(row)}</td>`
                )}
              </tr>
            `
          )}
        </tbody>
      </table>
    </div>
  `;
}

/** Text label for an SR outcome; color is a secondary cue only. */
export function outcomeBadge(outcome, labels) {
  const variant = {
    approved: 'aiux-badge-success',
    failed: 'aiux-badge-error',
    in_progress: 'aiux-badge-neutral'
  }[outcome] ?? '';
  return html`<span class="aiux-badge aiux-badge-sm aiux-badge-soft ${variant}">
    ${labels[outcome] ?? outcome}
  </span>`;
}
```

#### `pages/extended-observability/components/obs-data-table.js`

```js
import {html, css, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {repeat} from 'lit/directives/repeat.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import '@servicenow/aiux/aiux-components-pagination';

/**
 * Sortable, optionally paginated table for the observability tabs.
 *
 * columns: [{key, label, end?, sortable?, value(row), render?(row)}]
 * `value` drives sorting; `render` (default: value) drives display.
 */
@customElement('{{TAG_PREFIX}}-obs-data-table')
export class ObsDataTable extends AIUXElement {
  static properties = {
    columns: {attribute: false},
    rows: {attribute: false},
    caption: {type: String},
    pageSize: {type: Number, attribute: 'page-size'},
    sortKey: {type: String, attribute: 'sort-key'},
    sortDir: {type: String, attribute: 'sort-dir'},
    rowKey: {attribute: false},
    _page: {state: true}
  };

  static styles = css`
    :host {
      display: block;
    }
  `;

  constructor() {
    super();
    this.columns = [];
    this.rows = [];
    this.caption = '';
    this.pageSize = 0;
    this.sortKey = '';
    this.sortDir = 'desc';
    this.rowKey = (row, i) => i;
    this._page = 1;
  }

  willUpdate(changed) {
    if (changed.has('rows')) this._page = 1;
  }

  _sort(key) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'desc';
    }
    this._page = 1;
  }

  _onSortClick = e => {
    const key = e.target.closest('[data-sort]')?.dataset.sort;
    if (key) this._sort(key);
  };

  _onPage = e => {
    this._page = e.detail.page;
  };

  _sortedRows() {
    const col = this.columns.find(c => c.key === this.sortKey);
    if (!col) return this.rows;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...this.rows].sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      if (typeof x === 'string') return x.localeCompare(y) * dir;
      return (x - y) * dir;
    });
  }

  _ariaSort(c) {
    if (!c.sortable) return nothing;
    if (c.key !== this.sortKey) return 'none';
    return this.sortDir === 'asc' ? 'ascending' : 'descending';
  }

  _renderHeader(c) {
    const align = c.end ? 'text-end' : '';
    if (!c.sortable) return html`<th scope="col" class=${align}>${c.label}</th>`;
    const active = c.key === this.sortKey;
    const arrow = !active ? '↕' : this.sortDir === 'asc' ? '↑' : '↓';
    return html`
      <th scope="col" class=${align} aria-sort=${this._ariaSort(c)}>
        <button
          type="button"
          class="aiux-btn aiux-btn-ghost aiux-btn-xs gap-1 px-1 font-semibold uppercase"
          data-sort=${c.key}
          @click=${this._onSortClick}
        >
          ${c.label}<span aria-hidden="true">${arrow}</span>
        </button>
      </th>
    `;
  }

  render() {
    const sorted = this._sortedRows();
    const paged = this.pageSize > 0;
    const totalPages = paged ? Math.max(1, Math.ceil(sorted.length / this.pageSize)) : 1;
    const start = paged ? (this._page - 1) * this.pageSize : 0;
    const visible = paged ? sorted.slice(start, start + this.pageSize) : sorted;

    return html`
      ${paged
        ? html`<p class="mb-2 text-end font-mono text-xs text-text-secondary" role="status">
            ${i18n.getMessage('{0}–{1} of {2}', [
              sorted.length ? start + 1 : 0,
              start + visible.length,
              sorted.length
            ])}
          </p>`
        : nothing}
      <div class="overflow-x-auto">
        <table class="aiux-table aiux-table-sm">
          <caption class="sr-only">${this.caption}</caption>
          <thead>
            <tr>${this.columns.map(c => this._renderHeader(c))}</tr>
          </thead>
          <tbody>
            ${repeat(
              visible,
              this.rowKey,
              row => html`
                <tr>
                  ${this.columns.map(
                    c => html`<td class=${c.end ? 'text-end font-mono' : ''}>
                      ${c.render ? c.render(row) : c.value(row)}
                    </td>`
                  )}
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
      ${paged && totalPages > 1
        ? html`<div class="mt-3 flex justify-center">
            <aiux-pagination-nav
              .currentPage=${this._page}
              .totalPages=${totalPages}
              size="sm"
              @pagination-page-change=${this._onPage}
            ></aiux-pagination-nav>
          </div>`
        : nothing}
    `;
  }
}
```

#### `pages/extended-observability/components/obs-sr-lookup.js`

```js
import {html, css, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import './obs-data-table.js';
import {fmtNumber, fmtCompact, fmtCost, fmtDuration, fmtDateTime} from '../viz.js';

const ID_TYPES = ['auto', 'sr_number', 'task', 'alert', 'scenario', 'customer'];

/**
 * SR Lookup tab: search box plus the paginated list of all SRs in the window.
 * An exact SR number opens its detail page; anything else filters the list.
 */
@customElement('{{TAG_PREFIX}}-obs-sr-lookup')
export class ObsSrLookup extends AIUXElement {
  static properties = {
    data: {attribute: false},
    srs: {attribute: false},
    locale: {attribute: false},
    srLink: {attribute: false},
    openSr: {attribute: false},
    _query: {state: true},
    _type: {state: true},
    _message: {state: true}
  };

  static styles = css`
    :host {
      display: block;
    }
  `;

  constructor() {
    super();
    this._query = '';
    this._type = 'auto';
    this._message = '';
  }

  _typeLabel(id) {
    return {
      auto: i18n.getMessage('Auto-detect'),
      sr_number: i18n.getMessage('SR number'),
      task: i18n.getMessage('Task number'),
      alert: i18n.getMessage('Alert number'),
      scenario: i18n.getMessage('Scenario ID'),
      customer: i18n.getMessage('Customer ID')
    }[id];
  }

  _onSubmit = e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const query = String(form.get('query') ?? '').trim();
    this._type = String(form.get('type') ?? 'auto');
    this._query = query;
    if (!query) {
      this._message = '';
      return;
    }
    const exact = this._all().find(s => s.number.toLowerCase() === query.toLowerCase());
    if (exact && (this._type === 'auto' || this._type === 'sr_number')) {
      this.openSr?.(exact.number);
      return;
    }
    const count = this._filtered().length;
    this._message = count
      ? i18n.getMessage('{0} matching SRs', [fmtNumber(count, this.locale)])
      : i18n.getMessage('No SRs match "{0}" in this window.', [query]);
  };

  /** Live SRs (SR Lookup widget in IDB_DASHBOARD_WIDGETS.md), else the sample list. */
  _all() {
    return this.srs ?? this.data.srs;
  }

  _filtered() {
    const q = this._query.toLowerCase();
    if (!q) return this._all();
    return this._all().filter(s => s.number.toLowerCase().includes(q));
  }

  render() {
    if (!this.data) return nothing;
    const {locale} = this;
    // Values with no configured source are null and shown as a dash.
    const opt = (v, fmt = x => fmtNumber(x, locale)) => (v == null ? '—' : fmt(v));
    const columns = [
      {key: 'sr', label: i18n.getMessage('SR'), sortable: true, value: s => s.number, render: s => this.srLink(s.number)},
      {key: 'date', label: i18n.getMessage('Date'), sortable: true, value: s => s.time?.getTime() ?? 0, render: s => opt(s.time, t => fmtDateTime(t, locale))},
      {key: 'duration', label: i18n.getMessage('Duration'), end: true, sortable: true, value: s => s.durationMs ?? -1, render: s => opt(s.durationMs, v => fmtDuration(v, locale))},
      {key: 'agents', label: i18n.getMessage('Agents'), end: true, sortable: true, value: s => s.agents ?? -1, render: s => opt(s.agents)},
      {key: 'steps', label: i18n.getMessage('Steps'), end: true, sortable: true, value: s => s.steps ?? -1, render: s => opt(s.steps)},
      {key: 'tools', label: i18n.getMessage('Tools'), end: true, sortable: true, value: s => s.tools ?? -1, render: s => opt(s.tools)},
      {key: 'a2a', label: i18n.getMessage('A2A'), end: true, sortable: true, value: s => s.a2a ?? -1, render: s => opt(s.a2a)},
      {key: 'in', label: i18n.getMessage('In tok'), end: true, sortable: true, value: s => s.tokensIn, render: s => fmtCompact(s.tokensIn, locale)},
      {key: 'out', label: i18n.getMessage('Out tok'), end: true, sortable: true, value: s => s.tokensOut, render: s => fmtNumber(s.tokensOut, locale)},
      {key: 'cost', label: i18n.getMessage('Cost'), end: true, sortable: true, value: s => s.cost, render: s => fmtCost(s.cost, locale)}
    ];

    return html`
      <div class="flex flex-col gap-6">
        <form
          class="aiux-card mx-auto w-full max-w-3xl border border-base-300 bg-base-100 shadow-sm"
          role="search"
          aria-labelledby="lookup-title"
          @submit=${this._onSubmit}
        >
          <div class="aiux-card-body gap-3 p-4">
            <h2 id="lookup-title" class="text-sm font-semibold uppercase tracking-wide text-text-primary">
              ${i18n.getMessage('Navigate to SR / task / correlation ID')}
            </h2>
            <div class="flex flex-col gap-2 sm:flex-row">
              <label class="aiux-input min-w-0 flex-1">
                <span class="sr-only">${i18n.getMessage('Search ID')}</span>
                <input
                  name="query"
                  type="search"
                  class="font-mono"
                  .value=${this._query}
                  placeholder=${i18n.getMessage('SR-2026-NNNNNN, TASK-…, ALRT-…, or 9-digit customer ID')}
                  autocomplete="off"
                />
              </label>
              <label class="aiux-select sm:w-44">
                <span class="sr-only">${i18n.getMessage('ID type')}</span>
                <select name="type">
                  ${ID_TYPES.map(
                    t => html`<option value=${t} ?selected=${t === this._type}>${this._typeLabel(t)}</option>`
                  )}
                </select>
              </label>
              <button type="submit" class="aiux-btn aiux-btn-primary">${i18n.getMessage('Go')}</button>
            </div>
            <p class="text-sm text-text-secondary" role="status">${this._message}</p>
          </div>
        </form>

        <section
          class="aiux-card border border-base-300 bg-base-100 shadow-sm"
          aria-labelledby="all-srs-title"
        >
          <div class="aiux-card-body gap-2 p-4">
            <h2 id="all-srs-title" class="text-sm font-semibold uppercase tracking-wide text-text-primary">
              ${i18n.getMessage('All SRs')}
            </h2>
            <p class="text-sm text-text-secondary">
              ${this.data.range.hours == null
                ? i18n.getMessage('{0} SRs in total — select an SR number to open its detail page', [
                    fmtNumber(this._all().length, locale)
                  ])
                : i18n.getMessage('{0} SRs in the last {1} — select an SR number to open its detail page', [
                    fmtNumber(this._all().length, locale),
                    this.data.range.id
                  ])}
            </p>
            <{{TAG_PREFIX}}-obs-data-table
              .columns=${columns}
              .rows=${this._filtered()}
              .rowKey=${s => s.number}
              caption=${i18n.getMessage('All service requests')}
              sort-key="date"
              page-size="25"
            ></{{TAG_PREFIX}}-obs-data-table>
          </div>
        </section>
      </div>
    `;
  }
}
```

#### `pages/extended-observability/tabs/chart-helpers.js`

```js
import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import '@servicenow/aiux/aiux-components-visualizations-axis';
import '@servicenow/aiux/aiux-components-visualizations-composition';
import {seriesData, categoryData, TONE, FMT} from '../viz.js';

export const LEGEND_BOTTOM = {visible: true, position: 'bottom'};
export const NO_LEGEND = {visible: false};

/**
 * X-axis categories for the time buckets, labelled in the user's locale.
 * `d` is any dataset with `buckets` and `bucketMinutes` (sample or live).
 */
export function timeCategories(d, locale) {
  const spanHours = (d.buckets.length * d.bucketMinutes) / 60;
  const opts =
    d.bucketMinutes < 60
      ? {hour: 'numeric', minute: '2-digit'}
      : d.bucketMinutes >= 1440
        ? {year: 'numeric', month: 'short', day: 'numeric'}
        : spanHours <= 48
          ? {hour: 'numeric'}
          : {month: 'short', day: 'numeric', hour: 'numeric'};
  const fmt = new Intl.DateTimeFormat(locale, opts);
  return d.buckets.map(b => ({id: b.id, label: fmt.format(b.date)}));
}

/**
 * Multi-series trend over the time buckets. While a live dataset's trend data is
 * still loading (`d.trendsPending`), shows a placeholder instead.
 */
export function trendChart(d, ctx, series, {type = 'spline', format, yTitle} = {}) {
  if (d.trendsPending) {
    return html`
      <div class="aiux-skeleton h-full w-full" role="img" aria-label=${i18n.getMessage('Loading trend data')}></div>
    `;
  }
  const data = seriesData(timeCategories(d, ctx.locale), series, {
    dimLabel: i18n.getMessage('Time'),
    format
  });
  return html`
    <aiux-visualizations-axis
      type=${type}
      .data=${data}
      .legend=${series.length > 1 ? LEGEND_BOTTOM : NO_LEGEND}
      .axes=${{
        xAxis: {column: 'x'},
        yAxis: [{columns: series.map(s => s.key), title: yTitle}]
      }}
    ></aiux-visualizations-axis>
  `;
}

/** Donut with a custom centre value. */
export function donut(items, {center, centerLabel, valueLabel, format, colors}) {
  return html`
    <aiux-visualizations-composition
      type="donut"
      .data=${categoryData(items, {valueLabel, format, colors})}
      .legend=${LEGEND_BOTTOM}
      .centerContent=${{mode: 'custom', value: center, label: centerLabel ?? '', size: 'small'}}
      tooltip-show-percentage
    ></aiux-visualizations-composition>
  `;
}

/** Single-series bar chart (horizontal by default). */
export function barChart(items, {type = 'bar', valueLabel, format, rules, colors} = {}) {
  return html`
    <aiux-visualizations-axis
      type=${type}
      .data=${categoryData(items, {valueLabel, format, rules, colors})}
      .legend=${NO_LEGEND}
    ></aiux-visualizations-axis>
  `;
}

/** Grouped columns: one category per item, one series per metric. */
export function groupedBars(categories, series, {type = 'column', format} = {}) {
  return html`
    <aiux-visualizations-axis
      type=${type}
      .data=${seriesData(categories, series, {format})}
      .legend=${LEGEND_BOTTOM}
    ></aiux-visualizations-axis>
  `;
}

export function outcomeLabels() {
  return {
    approved: i18n.getMessage('approved'),
    failed: i18n.getMessage('failed'),
    in_progress: i18n.getMessage('in progress')
  };
}

export const OUTCOME_COLORS = {
  approved: TONE.success,
  failed: TONE.error,
  in_progress: TONE.neutral
};

export {FMT};
```

#### `pages/extended-observability/tabs/overview.js`

```js
import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import {section, card, chartBox, kpiRow, barList, table, outcomeBadge} from '../components/ui.js';
import {
  fmtNumber,
  fmtCompact,
  fmtCost,
  fmtPercent,
  fmtDuration,
  fmtDateTime,
  FMT
} from '../viz.js';
import {
  trendChart,
  donut,
  barChart,
  outcomeLabels,
  OUTCOME_COLORS
} from './chart-helpers.js';

export function renderOverview(d, ctx) {
  const {locale} = ctx;
  const k = d.kpis;
  // Widgets configured in IDB_DASHBOARD_WIDGETS.md read the live dataset.
  const L = d.live;
  const lk = L.kpis;
  const labels = outcomeLabels();

  return html`
    ${section(
      'ov-health',
      d.range.hours == null
        ? i18n.getMessage('Platform health — all time')
        : i18n.getMessage('Platform health — last {0}', [d.range.id]),
      '',
      kpiRow(
        [
          {label: i18n.getMessage('Total SRs'), value: fmtNumber(lk.totalSrs, locale)},
          {
            label: i18n.getMessage('Approved'),
            value: fmtNumber(lk.approved, locale),
            sub: fmtPercent((lk.approved / Math.max(1, lk.totalSrs)) * 100, locale),
            tone: 'success'
          },
          {
            label: i18n.getMessage('Failed'),
            value: fmtNumber(lk.failed, locale),
            sub: i18n.getMessage('{0} error rate', [
              fmtPercent((lk.failed / Math.max(1, lk.totalSrs)) * 100, locale)
            ]),
            tone: 'error'
          },
          {
            label: i18n.getMessage('Avg duration'),
            value: fmtDuration(lk.avgDurationMs, locale),
            sub: lk.p95DurationMs == null
              ? ''
              : i18n.getMessage('p95 {0}', [fmtDuration(lk.p95DurationMs, locale)])
          },
          {
            label: i18n.getMessage('LLM calls'),
            value: fmtNumber(lk.llmCalls, locale),
            sub: i18n.getMessage('{0} tokens in', [fmtCompact(lk.tokensIn, locale)])
          },
          {
            label: i18n.getMessage('LLM cost'),
            value: fmtCost(lk.cost, locale),
            sub: i18n.getMessage('avg {0}', [fmtCost(lk.avgCost, locale)]),
            tone: 'warning'
          }
        ],
        'lg:grid-cols-3 2xl:grid-cols-6'
      )
    )}

    ${section(
      'ov-throughput',
      i18n.getMessage('SR throughput'),
      i18n.getMessage('Service requests processed per interval'),
      card(
        chartBox(
          trendChart(L, ctx, [
            {key: 'total', label: i18n.getMessage('Processed'), values: L.series.activity},
            {key: 'failed', label: i18n.getMessage('Failed'), values: L.series.failed}
          ])
        )
      )
    )}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'ov-outcomes',
        i18n.getMessage('SR outcome distribution'),
        '',
        card(
          chartBox(
            donut(
              L.outcomes.map(o => ({id: o.id, label: o.label ?? labels[o.id] ?? o.id, value: o.value})),
              {
                center: fmtNumber(lk.totalSrs, locale),
                centerLabel: i18n.getMessage('SRs'),
                valueLabel: i18n.getMessage('SRs'),
                colors: OUTCOME_COLORS
              }
            )
          )
        )
      )}
      ${section(
        'ov-model-cost',
        i18n.getMessage('LLM cost by model'),
        i18n.getMessage('Spend per model in window'),
        card(
          barList(
            L.models.map(m => ({
              id: m.id,
              label: m.id,
              value: m.cost,
              text: i18n.getMessage('{0} calls · {1}', [fmtNumber(m.calls, locale), fmtCost(m.cost, locale)])
            })),
            {mono: true}
          )
        )
      )}
    </div>

    ${section(
      'ov-agent-cost',
      i18n.getMessage('Cost & tokens by agent'),
      i18n.getMessage('LLM spend and token consumption per agent'),
      html`<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        ${card(html`
          <h3 class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            ${i18n.getMessage('Cost by agent')}
          </h3>
          ${chartBox(
            barChart(
              L.agentCosts,
              {type: 'column', valueLabel: i18n.getMessage('Cost'), format: FMT.cost}
            ),
            'h-64'
          )}
        `)}
        ${card(html`
          <h3 class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            ${i18n.getMessage('Avg tokens / request')}
          </h3>
          ${chartBox(
            barChart(
              L.agentAvgTokens,
              {valueLabel: i18n.getMessage('Tokens'), format: FMT.compact}
            ),
            'h-64'
          )}
        `)}
        ${card(html`
          <h3 class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            ${i18n.getMessage('Total token consumption')}
          </h3>
          ${chartBox(
            barChart(
              L.agentTokens,
              {valueLabel: i18n.getMessage('Tokens'), format: FMT.compact}
            ),
            'h-64'
          )}
        `)}
      </div>`
    )}

    ${section(
      'ov-trends',
      i18n.getMessage('Cost & token trends over time'),
      i18n.getMessage('Spend and token usage across agents'),
      html`<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        ${card(html`
          <h3 class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            ${i18n.getMessage('LLM cost over time')}
          </h3>
          ${chartBox(
            trendChart(
              L,
              ctx,
              [{key: 'cost', label: i18n.getMessage('Cost'), values: L.series.cost}],
              {format: FMT.cost}
            ),
            'h-64'
          )}
        `)}
        ${card(html`
          <h3 class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            ${i18n.getMessage('Token consumption over time')}
          </h3>
          ${chartBox(
            trendChart(
              L,
              ctx,
              [
                {key: 'in', label: i18n.getMessage('Input'), values: L.series.tokensIn},
                {key: 'out', label: i18n.getMessage('Output'), values: L.series.tokensOut},
                {key: 'total', label: i18n.getMessage('Total'), values: L.series.tokensTotal}
              ],
              {format: FMT.compact}
            ),
            'h-64'
          )}
        `)}
      </div>`
    )}

    ${section(
      'ov-summary',
      i18n.getMessage('Platform summary'),
      i18n.getMessage('Agent-level cost, token and reliability metrics'),
      card(
        table(
          i18n.getMessage('Platform summary by agent'),
          [
            {label: i18n.getMessage('Agent'), render: a => a.name},
            {label: i18n.getMessage('SRs'), end: true, render: a => fmtNumber(a.srs, locale)},
            {label: i18n.getMessage('Total tokens'), end: true, render: a => fmtCompact(a.tokens, locale)},
            {label: i18n.getMessage('LLM calls'), end: true, render: a => fmtNumber(a.llmCalls, locale)},
            {label: i18n.getMessage('MCP calls'), end: true, render: a => fmtNumber(a.mcpCalls, locale)},
            {label: i18n.getMessage('Cost'), end: true, render: a => fmtCost(a.cost, locale)},
            {label: i18n.getMessage('Error rate'), end: true, render: a => fmtPercent(a.errRate, locale)},
            {label: i18n.getMessage('Avg LLM latency'), end: true, render: a => fmtDuration(a.avgMs, locale)}
          ],
          d.agents,
          a => a.key
        )
      )
    )}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'ov-utilization',
        i18n.getMessage('Agent utilization'),
        i18n.getMessage('SR coverage per agent'),
        card(
          barList(
            d.agents.map(a => ({
              id: a.key,
              label: a.name,
              value: a.srs,
              text: i18n.getMessage('{0} SRs', [fmtNumber(a.srs, locale)]),
              note: a.errRate > 0
                ? i18n.getMessage('{0} err', [fmtPercent(a.errRate, locale)])
                : '',
              tone: 'error'
            }))
          )
        )
      )}
      ${section(
        'ov-mcp',
        i18n.getMessage('MCP tool calls'),
        i18n.getMessage('Tool invocations across all agents'),
        card(html`
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            ${[
              [fmtNumber(k.mcpCalls, locale), i18n.getMessage('Total calls'), ''],
              [fmtNumber(k.mcpErrors, locale), i18n.getMessage('Errors'), 'text-error'],
              [fmtNumber(k.toolsActive, locale), i18n.getMessage('Tools active'), '']
            ].map(
              ([value, label, tone]) => html`
                <div class="rounded-box border border-base-300 p-3 text-center">
                  <p class="font-mono text-2xl font-bold ${tone}">${value}</p>
                  <p class="text-xs uppercase tracking-wide text-text-secondary">${label}</p>
                </div>
              `
            )}
          </div>
          ${barList(
            d.tools.slice(0, 5).map(t => ({
              id: t.id,
              label: t.id,
              value: t.calls,
              text: fmtNumber(t.calls, locale)
            })),
            {mono: true}
          )}
        `)
      )}
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      ${section(
        'ov-phases',
        i18n.getMessage('Top phase latencies'),
        i18n.getMessage('p50 / p95 across all SRs'),
        card(
          table(
            i18n.getMessage('Phase latencies'),
            [
              {label: i18n.getMessage('Phase'), render: p => html`<span class="font-mono text-xs">${p.agent} · ${p.phase}</span>`},
              {label: i18n.getMessage('Avg'), end: true, render: p => fmtDuration(p.avgMs, locale)},
              {label: i18n.getMessage('P50'), end: true, render: p => fmtDuration(p.p50Ms, locale)},
              {label: i18n.getMessage('P95'), end: true, render: p => fmtDuration(p.p95Ms, locale)}
            ],
            d.phases,
            p => `${p.agent}-${p.phase}`
          )
        )
      )}
      ${section(
        'ov-recent',
        i18n.getMessage('Recent SRs'),
        i18n.getMessage('Latest service requests'),
        card(
          table(
            i18n.getMessage('Recent service requests'),
            [
              {label: i18n.getMessage('SR'), render: s => ctx.srLink(s.number)},
              {label: i18n.getMessage('Time'), render: s => fmtDateTime(s.time, locale)},
              {label: i18n.getMessage('Outcome'), render: s => outcomeBadge(s.outcome, labels)},
              {label: i18n.getMessage('Duration'), end: true, render: s => fmtDuration(s.durationMs, locale)},
              {label: i18n.getMessage('Events'), end: true, render: s => fmtNumber(s.events, locale)}
            ],
            d.srs.slice(0, 10),
            s => s.number
          )
        )
      )}
    </div>
  `;
}
```

#### `pages/extended-observability/tabs/agents.js`

```js
import {html} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import {i18n} from '@servicenow/aiux/aiux-services';
import '@servicenow/aiux/aiux-components-visualizations-spider';
import {section, card, chartBox, kpi} from '../components/ui.js';
import {
  seriesData,
  fmtNumber,
  fmtCompact,
  fmtCost,
  fmtPercent,
  fmtDuration,
  TONE,
  FMT
} from '../viz.js';
import {trendChart, donut, LEGEND_BOTTOM} from './chart-helpers.js';

/** Normalised 0–100 scores per agent for the capability radar. */
function radarData(d) {
  const axes = [
    {id: 'invocations', label: i18n.getMessage('Invocations'), get: a => a.srs},
    {id: 'tokens', label: i18n.getMessage('LLM tokens'), get: a => a.tokens},
    {id: 'cost', label: i18n.getMessage('Cost'), get: a => a.cost},
    {id: 'mcp', label: i18n.getMessage('MCP calls'), get: a => a.mcpCalls},
    {id: 'reliability', label: i18n.getMessage('Reliability'), get: a => 100 - a.errRate}
  ];
  const max = Object.fromEntries(
    axes.map(x => [x.id, Math.max(1e-9, ...d.agents.map(x.get))])
  );
  return seriesData(
    axes.map(x => ({id: x.id, label: x.label})),
    d.agents.map(a => ({
      key: a.key,
      label: a.name,
      values: axes.map(x => Math.round((x.get(a) / max[x.id]) * 100))
    })),
    {format: FMT.count}
  );
}

function stat(label, value, tone = '') {
  return html`
    <div class="rounded-box bg-base-200 p-2">
      <p class="text-xs uppercase tracking-wide text-text-secondary">${label}</p>
      <p class="font-mono text-sm font-semibold ${tone}">${value}</p>
    </div>
  `;
}

function agentCard(a, locale) {
  return card(html`
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-base font-semibold text-text-primary break-all">${a.name}</h3>
      <span class="aiux-badge aiux-badge-sm aiux-badge-soft aiux-badge-primary font-mono">
        ${i18n.getMessage('{0} invocations', [fmtNumber(a.srs, locale)])}
      </span>
    </div>
    <div class="grid grid-cols-2 gap-2">
      ${stat(i18n.getMessage('Completed'), fmtNumber(a.completed, locale), 'text-success')}
      ${stat(i18n.getMessage('Failed'), fmtNumber(a.failed, locale), a.failed ? 'text-error' : '')}
      ${stat(i18n.getMessage('LLM calls'), fmtNumber(a.llmCalls, locale))}
      ${stat(i18n.getMessage('Tokens'), fmtCompact(a.tokens, locale))}
      ${stat(i18n.getMessage('Cost'), fmtCost(a.cost, locale))}
      ${stat(i18n.getMessage('MCP calls'), fmtNumber(a.mcpCalls, locale))}
    </div>
    <dl class="grid grid-cols-3 gap-2 text-xs">
      <div>
        <dt class="text-text-secondary">${i18n.getMessage('Avg latency')}</dt>
        <dd class="font-mono">${fmtDuration(a.avgMs, locale)}</dd>
      </div>
      <div>
        <dt class="text-text-secondary">${i18n.getMessage('p90')}</dt>
        <dd class="font-mono">${fmtDuration(a.p90Ms, locale)}</dd>
      </div>
      <div>
        <dt class="text-text-secondary">${i18n.getMessage('Error rate')}</dt>
        <dd class="font-mono ${a.errRate > 10 ? 'text-error' : ''}">${fmtPercent(a.errRate, locale)}</dd>
      </div>
    </dl>
  `);
}

export function renderAgents(d, ctx) {
  const {locale} = ctx;
  const k = d.kpis;
  // Trends configured in IDB_DASHBOARD_WIDGETS.md read the live dataset.
  const L = d.live;

  return html`
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      ${section(
        'ag-status',
        i18n.getMessage('Invocation status'),
        i18n.getMessage('Completed · Failed · In progress'),
        card(
          chartBox(
            donut(
              [
                {id: 'completed', label: i18n.getMessage('Completed'), value: k.invCompleted},
                {id: 'failed', label: i18n.getMessage('Failed'), value: k.invFailed},
                {id: 'in_progress', label: i18n.getMessage('In progress'), value: k.invInProgress}
              ],
              {
                center: fmtNumber(k.agentInvocations, locale),
                centerLabel: i18n.getMessage('Invocations'),
                valueLabel: i18n.getMessage('Invocations'),
                colors: {completed: TONE.success, failed: TONE.error, in_progress: TONE.neutral}
              }
            )
          )
        )
      )}
      ${section(
        'ag-trend',
        i18n.getMessage('Agent invocation trend'),
        i18n.getMessage('Requests per agent per interval'),
        card(
          chartBox(
            trendChart(L, ctx, L.series.invocations)
          )
        ),
        'xl:col-span-2'
      )}
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      ${section(
        'ag-tokens',
        i18n.getMessage('Token usage trend'),
        i18n.getMessage('Tokens consumed per agent per interval'),
        card(
          chartBox(
            trendChart(L, ctx, L.series.agentTokens, {format: FMT.compact})
          )
        ),
        'xl:col-span-2'
      )}
      ${section(
        'ag-aggregate',
        i18n.getMessage('Aggregate stats'),
        '',
        html`<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
          ${kpi({
            label: i18n.getMessage('Total agent invocations'),
            value: fmtNumber(k.agentInvocations, locale),
            sub: i18n.getMessage('{0} agents', [fmtNumber(d.agents.length, locale)]),
            tone: 'info'
          })}
          ${kpi({
            label: i18n.getMessage('Total tokens consumed'),
            value: fmtCompact(k.tokensIn + k.tokensOut, locale),
            sub: i18n.getMessage('In {0} / out {1}', [
              fmtCompact(k.tokensIn, locale),
              fmtCompact(k.tokensOut, locale)
            ]),
            tone: 'info'
          })}
          ${kpi({
            label: i18n.getMessage('Avg LLM latency'),
            value: fmtDuration(k.avgLlmLatencyMs, locale),
            sub: i18n.getMessage('across LLM-calling agents'),
            tone: 'warning'
          })}
        </div>`
      )}
    </div>

    ${section(
      'ag-latency',
      i18n.getMessage('LLM / MCP latency trend'),
      i18n.getMessage('Average latency per agent per interval (ms)'),
      card(
        chartBox(
          trendChart(
            d,
            ctx,
            Object.entries(d.series.latency).map(([key, values]) => ({key, label: key, values})),
            {format: FMT.ms}
          )
        )
      )
    )}

    ${section(
      'ag-radar',
      i18n.getMessage('Agent capability radar'),
      i18n.getMessage('Normalized metrics — invocations · tokens · cost · MCP calls · reliability'),
      card(
        chartBox(
          html`<aiux-visualizations-spider
            .data=${radarData(d)}
            .legend=${LEGEND_BOTTOM}
          ></aiux-visualizations-spider>`,
          'h-96'
        )
      )
    )}

    ${section(
      'ag-details',
      i18n.getMessage('Agent details'),
      i18n.getMessage('Performance breakdown per agent'),
      html`<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        ${repeat(d.agents, a => a.key, a => agentCard(a, locale))}
      </div>`
    )}
  `;
}
```

#### `pages/extended-observability/tabs/models.js`

```js
import {html} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import {i18n} from '@servicenow/aiux/aiux-services';
import {section, card, chartBox, kpiRow} from '../components/ui.js';
import {fmtNumber, fmtCompact, fmtCost, fmtDuration, FMT} from '../viz.js';
import {trendChart, donut, barChart, groupedBars} from './chart-helpers.js';

function modelCard(m, locale) {
  const stat = (label, value, tone = '') => html`
    <div class="rounded-box bg-base-200 p-2">
      <p class="text-xs uppercase tracking-wide text-text-secondary">${label}</p>
      <p class="font-mono text-sm font-semibold ${tone}">${value}</p>
    </div>
  `;
  return card(html`
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="font-mono text-base font-semibold text-text-primary break-all">${m.id}</h3>
      <span class="text-xs text-text-secondary">
        ${i18n.getMessage('{0} calls', [fmtNumber(m.calls, locale)])}
      </span>
    </div>
    <div class="grid grid-cols-2 gap-2">
      ${stat(i18n.getMessage('In tokens'), fmtCompact(m.tokensIn, locale))}
      ${stat(i18n.getMessage('Out tokens'), fmtCompact(m.tokensOut, locale))}
      ${stat(i18n.getMessage('Avg latency'), fmtDuration(m.avgMs, locale))}
      ${stat(i18n.getMessage('P90 latency'), m.p90Ms == null ? '—' : fmtDuration(m.p90Ms, locale), 'text-warning')}
    </div>
    <div>
      <h4 class="mb-1 text-xs uppercase tracking-wide text-text-secondary">
        ${i18n.getMessage('Top callers')}
      </h4>
      <ul class="text-sm">
        ${repeat(
          m.callers,
          c => c.agent,
          c => html`<li class="flex justify-between gap-2">
            <span class="break-all">${c.agent}</span>
            <span class="font-mono">${fmtNumber(c.calls, locale)}</span>
          </li>`
        )}
      </ul>
    </div>
  `);
}

export function renderModels(d, ctx) {
  const {locale} = ctx;
  // Widgets configured in IDB_DASHBOARD_WIDGETS.md read the live dataset.
  const L = d.live;
  const lk = L.kpis;

  return html`
    ${kpiRow(
      [
        {
          label: i18n.getMessage('Total LLM calls'),
          value: fmtNumber(lk.llmCalls, locale),
          sub: i18n.getMessage('{0} input tokens', [fmtCompact(lk.tokensIn, locale)])
        },
        {
          label: i18n.getMessage('Total tokens'),
          value: fmtCompact(lk.totalTokens, locale),
          sub: i18n.getMessage('{0} model(s) active', [fmtNumber(L.models.length, locale)])
        },
        {label: i18n.getMessage('Total cost'), value: fmtCost(lk.cost, locale), tone: 'warning'}
      ],
      'lg:grid-cols-3'
    )}

    ${section(
      'md-tokens',
      i18n.getMessage('Token usage by model over time'),
      i18n.getMessage('Tokens consumed per model per interval'),
      card(
        chartBox(
          trendChart(
            L,
            ctx,
            L.series.modelTokens,
            {format: FMT.compact}
          )
        )
      )
    )}

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      ${section(
        'md-calls',
        i18n.getMessage('Model call trend'),
        i18n.getMessage('LLM calls per model per interval'),
        card(
          chartBox(
            trendChart(L, ctx, L.series.modelCalls)
          )
        ),
        'xl:col-span-2'
      )}
      ${section(
        'md-share',
        i18n.getMessage('Calls by model'),
        '',
        card(
          chartBox(
            donut(
              L.models.map(m => ({id: m.id, label: m.id, value: m.calls})),
              {
                center: fmtNumber(L.models.reduce((s, m) => s + m.calls, 0), locale),
                centerLabel: i18n.getMessage('Calls'),
                valueLabel: i18n.getMessage('Calls')
              }
            )
          )
        )
      )}
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'md-cost',
        i18n.getMessage('Cost distribution'),
        i18n.getMessage('Spend share by model'),
        card(
          chartBox(
            donut(
              L.models.map(m => ({id: m.id, label: m.id, value: m.cost})),
              {
                center: fmtCost(L.models.reduce((s, m) => s + m.cost, 0), locale),
                valueLabel: i18n.getMessage('Cost'),
                format: FMT.cost
              }
            )
          )
        )
      )}
      ${section(
        'md-latency',
        i18n.getMessage('Latency by model'),
        i18n.getMessage('Average vs p90 response time (ms)'),
        card(
          chartBox(
            groupedBars(
              L.models.map(m => ({id: m.id, label: m.id})),
              [
                {key: 'avg', label: i18n.getMessage('Avg'), values: L.models.map(m => Math.round(m.avgMs))},
                // p90 comes from the trends request, which may still be loading.
                ...(L.trendsPending
                  ? []
                  : [{key: 'p90', label: i18n.getMessage('p90'), values: L.models.map(m => Math.round(m.p90Ms ?? 0))}])
              ],
              {format: FMT.ms}
            )
          )
        )
      )}
    </div>

    ${section(
      'md-callers',
      i18n.getMessage('Callers per model'),
      i18n.getMessage('Which agents called each model and how many times'),
      html`<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        ${repeat(
          d.models,
          m => m.id,
          m => card(html`
            <h3 class="font-mono text-sm font-semibold text-text-primary break-all">${m.id}</h3>
            ${chartBox(
              barChart(
                m.callers.map(c => ({id: c.agent, label: c.agent, value: c.calls})),
                {valueLabel: i18n.getMessage('Calls')}
              ),
              'h-40'
            )}
          `)
        )}
      </div>`
    )}

    ${section(
      'md-details',
      i18n.getMessage('Model details'),
      i18n.getMessage('Per-model breakdown'),
      html`<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        ${repeat(d.models, m => m.id, m => modelCard(m, locale))}
      </div>`
    )}
  `;
}
```

#### `pages/extended-observability/tabs/mcp-tools.js`

```js
import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import '@servicenow/aiux/aiux-components-visualizations-matrix';
import {section, card, chartBox, barList} from '../components/ui.js';
import {matrixData, fmtNumber, fmtDuration, fmtPercent} from '../viz.js';
import {trendChart, donut} from './chart-helpers.js';

export function renderMcpTools(d, ctx) {
  const {locale} = ctx;
  // Widgets configured in IDB_DASHBOARD_WIDGETS.md read the live dataset.
  const L = d.live;
  const live = L.source === 'live';
  const top6 = L.tools.slice(0, 6);

  return html`
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      ${section(
        'mcp-trend',
        i18n.getMessage('MCP call volume trend'),
        i18n.getMessage('Total tool invocations and errors per interval'),
        card(
          chartBox(
            trendChart(L, ctx, [
              {key: 'calls', label: i18n.getMessage('Calls'), values: L.series.mcpCalls},
              // No error source is configured for live data.
              ...(live
                ? []
                : [{key: 'errors', label: i18n.getMessage('Errors'), values: d.series.mcpErrors}])
            ])
          )
        ),
        'xl:col-span-2'
      )}
      ${section(
        'mcp-share',
        i18n.getMessage('Tool volume share'),
        i18n.getMessage('Top 6 tools by invocation count'),
        card(
          chartBox(
            donut(
              top6.map(t => ({id: t.id, label: t.id, value: t.calls})),
              {
                center: fmtNumber(top6.reduce((s, t) => s + t.calls, 0), locale),
                centerLabel: i18n.getMessage('Calls'),
                valueLabel: i18n.getMessage('Calls')
              }
            ),
            'h-80'
          )
        )
      )}
    </div>

    ${section(
      'mcp-performance',
      i18n.getMessage('Tool performance'),
      i18n.getMessage('Calls · errors · avg latency — sorted by volume'),
      card(
        barList(
          live
            ? L.tools.map(t => ({
                id: t.id,
                label: t.label,
                value: t.calls,
                text: i18n.getMessage('{0} calls', [fmtNumber(t.calls, locale)])
              }))
            : d.tools.map(t => ({
                id: t.id,
                label: t.id,
                value: t.calls,
                text: i18n.getMessage('{0} calls · avg {1} · p90 {2}', [
                  fmtNumber(t.calls, locale),
                  fmtDuration(t.avgMs, locale),
                  fmtDuration(t.p90Ms, locale)
                ]),
                note: t.errRate > 0
                  ? i18n.getMessage('{0} err', [fmtPercent(t.errRate, locale)])
                  : '',
                tone: t.errRate > 10 ? 'error' : 'warning'
              })),
          {mono: true}
        )
      )
    )}

    ${section(
      'mcp-matrix',
      i18n.getMessage('Agent × tool call matrix'),
      i18n.getMessage('Cell = number of calls from that agent to that tool'),
      card(
        chartBox(
          html`<aiux-visualizations-matrix
            .data=${matrixData(
              L.matrix.tools.map(id => ({id, label: id})),
              L.matrix.agents.map(id => ({id, label: id})),
              L.matrix.cells.filter(c => L.matrix.tools.includes(c.x)),
              {
                xLabel: i18n.getMessage('Tool'),
                yLabel: i18n.getMessage('Agent'),
                valueLabel: i18n.getMessage('Calls')
              }
            )}
            labels="values"
            .legend=${{position: 'bottom'}}
          ></aiux-visualizations-matrix>`,
          'h-96'
        )
      )
    )}
  `;
}
```

#### `pages/extended-observability/tabs/finops.js`

```js
import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import {section, card, chartBox, table} from '../components/ui.js';
import {fmtNumber, fmtCompact, fmtCost, FMT} from '../viz.js';
import {trendChart, donut} from './chart-helpers.js';

export function renderFinOps(d, ctx) {
  const {locale} = ctx;
  // Widgets configured in IDB_DASHBOARD_WIDGETS.md read the live dataset.
  const L = d.live;
  const cost = L.kpis.cost;
  const agentCosts = L.agentCosts.filter(a => a.value > 0);
  const top6 = L.tools.slice(0, 6);

  return html`
    ${card(
      html`<div class="py-2 text-center">
        <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          ${i18n.getMessage('Total LLM spend in window')}
        </p>
        <p class="font-mono text-4xl font-bold text-warning">${fmtCost(cost, locale)}</p>
        <p class="text-sm text-text-secondary">
          ${i18n.getMessage('{0} agents · {1} models', [
            fmtNumber(agentCosts.length, locale),
            fmtNumber(L.models.length, locale)
          ])}
        </p>
      </div>`
    )}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      ${section(
        'fo-agent',
        i18n.getMessage('Cost by agent'),
        i18n.getMessage('LLM spend attributed per agent'),
        card(
          chartBox(
            donut(
              agentCosts,
              {center: fmtCost(cost, locale), valueLabel: i18n.getMessage('Cost'), format: FMT.cost}
            ),
            'h-80'
          )
        )
      )}
      ${section(
        'fo-model',
        i18n.getMessage('Cost by model'),
        i18n.getMessage('Spend per LLM model'),
        card(
          chartBox(
            donut(
              L.models.map(m => ({id: m.id, label: m.id, value: m.cost})),
              {center: fmtCost(cost, locale), valueLabel: i18n.getMessage('Cost'), format: FMT.cost}
            ),
            'h-80'
          )
        )
      )}
      ${section(
        'fo-tools',
        i18n.getMessage('MCP tool call volume'),
        i18n.getMessage('Top 6 tools by invocation count'),
        card(
          chartBox(
            donut(
              top6.map(t => ({id: t.id, label: t.id, value: t.calls})),
              {
                center: fmtNumber(top6.reduce((s, t) => s + t.calls, 0), locale),
                centerLabel: i18n.getMessage('Calls'),
                valueLabel: i18n.getMessage('Calls')
              }
            ),
            'h-80'
          )
        )
      )}
    </div>

    ${section(
      'fo-cost-trend',
      i18n.getMessage('Cost consumption over time'),
      i18n.getMessage('LLM spend per interval'),
      card(
        chartBox(
          trendChart(
            L,
            ctx,
            [{key: 'cost', label: i18n.getMessage('Cost'), values: L.series.costConsumption}],
            {type: 'areaspline', format: FMT.cost}
          )
        )
      )
    )}

    ${section(
      'fo-token-trend',
      i18n.getMessage('Token consumption over time'),
      i18n.getMessage('Input and output tokens per interval'),
      card(
        chartBox(
          trendChart(
            L,
            ctx,
            [
              {key: 'in', label: i18n.getMessage('Input'), values: L.series.tokensIn},
              {key: 'out', label: i18n.getMessage('Output'), values: L.series.tokensOut}
            ],
            {type: 'areaspline', format: FMT.compact}
          )
        )
      )
    )}

    ${section(
      'fo-breakdown',
      i18n.getMessage('Model cost breakdown'),
      i18n.getMessage('Input/output cost split per model'),
      card(
        table(
          i18n.getMessage('Model cost breakdown'),
          [
            {label: i18n.getMessage('Model'), render: m => html`<span class="font-mono">${m.id}</span>`},
            {label: i18n.getMessage('Calls'), end: true, render: m => fmtNumber(m.calls, locale)},
            {label: i18n.getMessage('In tokens'), end: true, render: m => fmtCompact(m.tokensIn, locale)},
            {label: i18n.getMessage('Out tokens'), end: true, render: m => fmtCompact(m.tokensOut, locale)},
            {
              label: i18n.getMessage('Avg tok/req'),
              end: true,
              render: m => fmtNumber(Math.round((m.tokensIn + m.tokensOut) / Math.max(1, m.calls)), locale)
            },
            {label: i18n.getMessage('In cost'), end: true, render: m => fmtCost(m.inCost, locale)},
            {label: i18n.getMessage('Out cost'), end: true, render: m => fmtCost(m.outCost, locale)},
            {label: i18n.getMessage('Total cost'), end: true, render: m => fmtCost(m.cost, locale)}
          ],
          d.models,
          m => m.id
        )
      )
    )}
  `;
}
```

#### `pages/extended-observability/tabs/llm-traces.js`

```js
import {html} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import {i18n} from '@servicenow/aiux/aiux-services';
import '../components/obs-data-table.js';
import {section, card, chartBox, kpiRow} from '../components/ui.js';
import {fmtNumber, fmtCompact, fmtCost, fmtDuration, fmtTime, FMT} from '../viz.js';
import {barChart} from './chart-helpers.js';

/** `L` is the live dataset (sample-shaped when the instance is unavailable). */
export function topSrsByCost(L, n = 10) {
  return [...L.srs].sort((a, b) => b.cost - a.cost).slice(0, n);
}

/** Ranked list of the costliest SRs; shared with Exec View. */
export function topSrList(L, ctx, n = 10) {
  return html`
    <ol class="flex flex-col divide-y divide-base-300">
      ${repeat(
        topSrsByCost(L, n),
        s => s.number,
        (s, i) => html`
          <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span class="w-6 font-mono text-xs text-text-secondary">${fmtNumber(i + 1, ctx.locale)}</span>
            <span class="min-w-0 flex-1">${ctx.srLink(s.number)}</span>
            <span class="text-xs text-text-secondary">
              ${i18n.getMessage('{0} calls', [fmtNumber(s.llmCalls, ctx.locale)])}
            </span>
            <span class="font-mono text-warning">${fmtCost(s.cost, ctx.locale)}</span>
          </li>
        `
      )}
    </ol>
  `;
}

export function renderLlmTraces(d, ctx) {
  const {locale} = ctx;
  const L = d.live;
  const k = L.kpis;
  const opt = (v, fmt) => (v == null ? '—' : fmt(v));
  const columns = [
    {key: 'time', label: i18n.getMessage('Time'), sortable: true, value: s => s.time.getTime(), render: s => fmtTime(s.time, locale)},
    {key: 'agent', label: i18n.getMessage('Agent'), value: s => s.agent ?? '', render: s => (s.agent ? html`<span class="aiux-badge aiux-badge-sm aiux-badge-soft aiux-badge-primary">${s.agent}</span>` : '—')},
    {key: 'model', label: i18n.getMessage('Model'), value: s => s.model ?? '', render: s => (s.model ? html`<span class="font-mono text-xs">${s.model}</span>` : '—')},
    {key: 'sr', label: i18n.getMessage('SR'), value: s => s.sr ?? '', render: s => (s.sr ? ctx.srLink(s.sr) : '—')},
    {key: 'latency', label: i18n.getMessage('Latency'), end: true, sortable: true, value: s => s.latencyMs ?? -1, render: s => opt(s.latencyMs, v => fmtDuration(v, locale))},
    {key: 'input', label: i18n.getMessage('Input'), end: true, sortable: true, value: s => s.input, render: s => fmtCompact(s.input, locale)},
    {key: 'output', label: i18n.getMessage('Output'), end: true, value: s => s.output, render: s => fmtNumber(s.output, locale)},
    {key: 'cost', label: i18n.getMessage('Cost'), end: true, sortable: true, value: s => s.cost, render: s => fmtCost(s.cost, locale)}
  ];

  // The span list and p90s come from the trends request, which may still be loading.
  const spans = L.trendsPending
    ? html`<div class="aiux-skeleton h-72 w-full" role="img" aria-label=${i18n.getMessage('Loading LLM call spans')}></div>`
    : html`<{{TAG_PREFIX}}-obs-data-table
        .columns=${columns}
        .rows=${L.spans}
        .rowKey=${(s, i) => `${s.time.getTime()}-${i}`}
        caption=${i18n.getMessage('LLM call spans')}
        sort-key="time"
        page-size="25"
      ></{{TAG_PREFIX}}-obs-data-table>`;

  return html`
    ${kpiRow([
      {
        label: i18n.getMessage('Total LLM cost'),
        value: fmtCost(k.cost, locale),
        sub: i18n.getMessage('{0} calls', [fmtNumber(k.llmCalls, locale)]),
        tone: 'warning'
      },
      {
        label: i18n.getMessage('LLM call spans'),
        value: fmtNumber(k.llmCalls, locale),
        sub: i18n.getMessage('{0} tokens', [fmtCompact(k.tokensIn + k.tokensOut, locale)])
      },
      {
        label: i18n.getMessage('Avg p90 latency'),
        value: opt(k.avgP90Ms, v => fmtDuration(v, locale)),
        sub: i18n.getMessage('across active models')
      },
      {
        label: i18n.getMessage('Models active'),
        value: fmtNumber(L.models.length, locale),
        sub: i18n.getMessage('{0} agents', [fmtNumber(k.llmAgents ?? 0, locale)])
      }
    ])}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'tr-top',
        i18n.getMessage('Top SRs by cost'),
        i18n.getMessage('Service requests ranked by total LLM spend'),
        card(topSrList(L, ctx))
      )}
      ${section(
        'tr-p90',
        i18n.getMessage('P90 latency by model'),
        i18n.getMessage('90th-percentile inference time'),
        card(
          L.trendsPending
            ? html`<div class="aiux-skeleton h-48 w-full" role="img" aria-label=${i18n.getMessage('Loading trend data')}></div>`
            : chartBox(
                barChart(
                  L.models.filter(m => m.p90Ms != null).map(m => ({id: m.id, label: m.id, value: m.p90Ms})),
                  {valueLabel: i18n.getMessage('P90 latency'), format: FMT.ms}
                ),
                'h-48'
              )
        )
      )}
    </div>

    ${section(
      'tr-spans',
      i18n.getMessage('LLM call spans'),
      i18n.getMessage('{0} most recent calls · select an SR number to drill in · select a column header to sort', [
        fmtNumber(L.trendsPending ? 0 : L.spans.length, locale)
      ]),
      card(spans)
    )}
  `;
}
```

#### `pages/extended-observability/tabs/exec-view.js`

```js
import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import {section, card, chartBox, kpiRow} from '../components/ui.js';
import {fmtNumber, fmtCost, fmtPercent, FMT} from '../viz.js';
import {trendChart, donut, barChart, groupedBars} from './chart-helpers.js';
import {topSrList} from './llm-traces.js';

export function renderExecView(d, ctx) {
  const {locale} = ctx;
  // Every section reads the live dataset (sample-shaped when the instance is unavailable).
  const L = d.live;
  const k = L.kpis;
  const succeeded = k.totalSrs - k.failed;
  const pct = n => (n / Math.max(1, k.totalSrs)) * 100;

  return html`
    ${kpiRow([
      {
        label: i18n.getMessage('Total cost (USD)'),
        value: fmtCost(k.cost, locale),
        sub: i18n.getMessage('{0} calls', [fmtNumber(k.llmCalls, locale)]),
        tone: 'warning'
      },
      {
        label: i18n.getMessage('Total calls'),
        value: fmtNumber(k.llmCalls, locale),
        sub: i18n.getMessage('{0} SRs', [fmtNumber(k.totalSrs, locale)]),
        tone: 'info'
      },
      {
        label: i18n.getMessage('Successful SRs'),
        value: fmtPercent(pct(succeeded), locale),
        sub: i18n.getMessage('{0} succeeded', [fmtNumber(succeeded, locale)]),
        tone: 'info'
      },
      {
        label: i18n.getMessage('Error rate'),
        value: fmtPercent(pct(k.failed), locale),
        sub: i18n.getMessage('{0} failures', [fmtNumber(k.failed, locale)]),
        tone: 'error'
      }
    ])}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'ex-tokens',
        i18n.getMessage('Token usage'),
        i18n.getMessage('Prompt and completion tokens per interval'),
        card(
          chartBox(
            trendChart(
              L,
              ctx,
              [
                {key: 'prompt', label: i18n.getMessage('Prompt tokens'), values: L.series.tokensIn},
                {key: 'completion', label: i18n.getMessage('Completion tokens'), values: L.series.tokensOut}
              ],
              {type: 'line', format: FMT.compact}
            )
          )
        )
      )}
      ${section(
        'ex-p90',
        i18n.getMessage('P90 latency (ms)'),
        i18n.getMessage('90th-percentile and average inference time per model'),
        card(
          chartBox(
            groupedBars(
              L.models.map(m => ({id: m.id, label: m.id})),
              [
                // p90 comes from the trends request, which may still be loading.
                ...(L.trendsPending
                  ? []
                  : [{key: 'p90', label: i18n.getMessage('p90'), values: L.models.map(m => Math.round(m.p90Ms ?? 0))}]),
                {key: 'avg', label: i18n.getMessage('Avg'), values: L.models.map(m => Math.round(m.avgMs))}
              ],
              {type: 'line', format: FMT.ms}
            )
          )
        )
      )}
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'ex-model-cost',
        i18n.getMessage('Cost by model'),
        i18n.getMessage('LLM spend split by model'),
        card(
          chartBox(
            barChart(
              L.models.map(m => ({id: m.id, label: m.id, value: m.cost})),
              {valueLabel: i18n.getMessage('Cost'), format: FMT.cost}
            ),
            'h-48'
          )
        )
      )}
      ${section(
        'ex-top',
        i18n.getMessage('Top service requests by cost'),
        i18n.getMessage('Highest-spend SRs in this window'),
        card(topSrList(L, ctx, 8))
      )}
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'ex-agent-cost',
        i18n.getMessage('Cost by agent'),
        i18n.getMessage('LLM spend attributed to each agent'),
        card(
          chartBox(
            barChart(
              L.agentCosts.filter(a => a.value > 0),
              {valueLabel: i18n.getMessage('Cost'), format: FMT.cost}
            ),
            'h-56'
          )
        )
      )}
      ${section(
        'ex-model-share',
        i18n.getMessage('Model distribution by calls'),
        i18n.getMessage('Share of LLM invocations per model'),
        card(
          chartBox(
            donut(
              L.models.map(m => ({id: m.id, label: m.id, value: m.calls})),
              {
                center: fmtNumber(L.models.reduce((s, m) => s + m.calls, 0), locale),
                centerLabel: i18n.getMessage('Calls'),
                valueLabel: i18n.getMessage('Calls')
              }
            )
          )
        )
      )}
    </div>
  `;
}
```

#### `pages/extended-observability/tabs/performance.js`

```js
import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import {section, card, chartBox, kpiRow} from '../components/ui.js';
import {fmtNumber, fmtCompact, fmtPercent, fmtDuration, thresholdRules, TONE, FMT} from '../viz.js';
import {trendChart, donut, barChart} from './chart-helpers.js';

export function renderPerformance(d, ctx) {
  const {locale} = ctx;
  // Every section reads the live dataset (sample-shaped when the instance is unavailable).
  const L = d.live;
  const k = L.kpis;
  const errPct = (k.failed / Math.max(1, k.totalSrs)) * 100;

  return html`
    ${kpiRow([
      {
        label: i18n.getMessage('Average latency (p90)'),
        value: k.avgP90Ms == null ? '—' : fmtDuration(k.avgP90Ms, locale),
        sub: i18n.getMessage('across all models'),
        tone: 'info'
      },
      {
        label: i18n.getMessage('Total LLM calls'),
        value: fmtNumber(k.llmCalls, locale),
        sub: i18n.getMessage('{0} SRs', [fmtNumber(k.totalSrs, locale)])
      },
      {
        label: i18n.getMessage('Total errors'),
        value: fmtNumber(k.failed, locale),
        sub: i18n.getMessage('failed SRs ({0})', [fmtPercent(errPct, locale)]),
        tone: 'warning'
      },
      {
        label: i18n.getMessage('Error rate'),
        value: fmtPercent(errPct, locale),
        sub: i18n.getMessage('{0} total SRs', [fmtNumber(k.totalSrs, locale)]),
        tone: 'error'
      }
    ])}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'pf-model-calls',
        i18n.getMessage('LLM calls per model'),
        i18n.getMessage('Call volume per model over time'),
        card(chartBox(trendChart(L, ctx, L.series.modelCalls, {type: 'line'})))
      )}
      ${section(
        'pf-throughput',
        i18n.getMessage('Throughput'),
        i18n.getMessage('Spans processed per interval'),
        card(
          chartBox(
            trendChart(
              L,
              ctx,
              [{key: 'spans', label: i18n.getMessage('Spans'), values: L.series.activity}],
              {type: 'line'}
            )
          )
        )
      )}
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'pf-errors',
        i18n.getMessage('Error rate by agent'),
        i18n.getMessage('Failure % — red above 10% · amber above 5% · blue at or below 5%'),
        card(
          chartBox(
            barChart(
              L.agentErrors.map(a => ({id: a.id, label: a.label, value: Number(a.errRate.toFixed(1))})),
              {
                valueLabel: i18n.getMessage('Error rate'),
                format: FMT.percent,
                rules: thresholdRules(TONE.info, [
                  [5, TONE.warning],
                  [10, TONE.error]
                ])
              }
            ),
            'h-80'
          )
        )
      )}
      ${section(
        'pf-tokens',
        i18n.getMessage('Model usage by token count'),
        i18n.getMessage('Total tokens (input + output) per model'),
        card(
          chartBox(
            donut(
              L.models.map(m => ({id: m.id, label: m.id, value: m.tokensIn + m.tokensOut})),
              {
                center: fmtCompact(L.models.reduce((s, m) => s + m.tokensIn + m.tokensOut, 0), locale),
                centerLabel: i18n.getMessage('Tokens'),
                valueLabel: i18n.getMessage('Tokens'),
                format: FMT.compact
              }
            ),
            'h-80'
          )
        )
      )}
    </div>

    ${section(
      'pf-activity',
      i18n.getMessage('Agent activity over time'),
      i18n.getMessage('Invocations per agent per interval'),
      card(chartBox(trendChart(L, ctx, L.series.invocations, {type: 'areaspline'})))
    )}
  `;
}
```

#### `pages/extended-observability/tabs/sr-lookup.js`

```js
import {html} from 'lit';
import '../components/obs-sr-lookup.js';

export function renderSrLookup(d, ctx) {
  return html`<{{TAG_PREFIX}}-obs-sr-lookup
    .data=${d}
    .srs=${d.live.srs}
    .locale=${ctx.locale}
    .srLink=${ctx.srLink}
    .openSr=${ctx.openSr}
  ></{{TAG_PREFIX}}-obs-sr-lookup>`;
}
```

---

## 7. Verify (all must pass)

1. `pnpm install`, then `pnpm lint`: no errors (warnings in other files are fine). `pnpm build` succeeds.
2. Local preview (`pnpm dev`): open `/extended-observability`.
   - Header shows **Extended Observability** / **Monitor health, cost and performance**, with no data badges.
   - The skeleton is replaced by charts within a second. The browser console shows no
     "Hydration Mismatch" and no errors.
   - The URL shows `?tab=overview&range=15d` after switching once. Switching tabs keeps the range,
     and switching ranges keeps the tab. **Never `undefined`.**
   - Every tab renders its sections and charts. Each range button reloads the charts. Refresh works.
   - SR Lookup: search filters the table. Clicking an SR opens `/extended-observability/sr/<SR>`
     with KPI tiles, and "Back to SR lookup" returns to the SR Lookup tab.
   - The Network tab shows **no** `/api/now/stats` or `/api/.../observability` requests.
3. Deploy: `now-sdk install --auth <alias>`. If an old shell has `SN_SDK_*` env vars set, unset them
   first. The instance can take **hours** to serve newly installed page code. Check in an incognito
   window. Bumping the version number does not speed this up.
