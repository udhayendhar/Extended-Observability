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

const log = getLogger('x-assro-aict-obser-obs-dashboard-page');

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

  /**
   * Show the data-source badge and the live-data error notices. When no live
   * source loads, the page shows the errors instead of sample charts.
   */
  static showDataSource = true;

  /** Load live data from the instance; false renders the sample dataset only. */
  static liveData = true;

  static properties = {
    _tab: {state: true},
    _range: {state: true},
    _data: {state: true},
    _loading: {state: true},
    _refreshedAt: {state: true},
    _noticeDismissed: {state: true}
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
    // A new load shows its failures again, even if the last warning was closed.
    if (this._noticeDismissed) this._noticeDismissed = false;

    // The sample and live pages share this module, so key the cache by mode too.
    const cacheKey = `${this.constructor.liveData ? 'live' : 'sample'}:${range}`;
    const cached = !force && rangeCache.get(cacheKey);
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
    let errors = null;
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
      errors = error?.errors ?? {load: error?.message || String(error)};
    }
    // A newer range or refresh started, or the page was disconnected.
    if (id !== this._loadId || abort.signal.aborted) return;
    this._abort = null;
    this._data = {...sample, live: live ?? {...sampleAsLive(sample), unavailable: true, errors}};
    this._refreshedAt = now;
    this._loading = false;
    if (live) rangeCache.set(cacheKey, {data: this._data, at: now});
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
    if (live.unavailable) {
      return html`<span class="aiux-badge aiux-badge-error aiux-badge-soft aiux-badge-sm">
        ${i18n.getMessage('Live data unavailable')}
      </span>`;
    }
    if (live.source !== 'live') {
      return html`<span class="aiux-badge aiux-badge-warning aiux-badge-soft aiux-badge-sm">
        ${i18n.getMessage('Sample data')}
      </span>`;
    }
    return live.failed?.length
      ? html`<span class="aiux-badge aiux-badge-warning aiux-badge-soft aiux-badge-sm">
          ${i18n.getMessage('Live data · some sections failed')}
        </span>`
      : html`<span class="aiux-badge aiux-badge-success aiux-badge-soft aiux-badge-sm">
          ${i18n.getMessage('Live data')}
        </span>`;
  }

  /** One line per failed source: its name and the error the instance returned. */
  _renderErrorList(errors) {
    const entries = Object.entries(errors ?? {});
    if (!entries.length) return nothing;
    return html`<ul class="mt-2 flex flex-col gap-1 text-sm">
      ${entries.map(
        ([source, message]) => html`<li class="break-words">
          <span class="font-mono font-semibold">${source}</span>: <span class="font-mono">${message}</span>
        </li>`
      )}
    </ul>`;
  }

  _renderNotice() {
    const live = this._data?.live;
    if (!live || !this.constructor.showDataSource) return nothing;
    if (live.unavailable) {
      return html`<div class="aiux-alert aiux-alert-error flex-col items-start" role="alert">
        <p class="font-semibold">${i18n.getMessage('Live observability data could not be loaded.')}</p>
        <p class="text-sm">
          ${i18n.getMessage(
            'Check that table {0} exists, that it has the custom u_ fields, and that you can read it. Then select Refresh.',
            ['sn_ai_observe_ai_span']
          )}
        </p>
        ${this._renderErrorList(live.errors)}
      </div>`;
    }
    if (live.failed?.length && !this._noticeDismissed) {
      return html`<div class="aiux-alert aiux-alert-warning flex items-start justify-between gap-2" role="alert">
        <div class="flex min-w-0 flex-col items-start">
          <p class="font-semibold">
            ${i18n.getMessage('{0} live queries failed. Charts that depend on them show sample values.', [
              String(live.failed.length)
            ])}
          </p>
          ${this._renderErrorList(live.errors)}
        </div>
        <button
          type="button"
          class="aiux-btn aiux-btn-ghost aiux-btn-sm aiux-btn-square shrink-0"
          aria-label=${i18n.getMessage('Dismiss warning')}
          title=${i18n.getMessage('Dismiss warning')}
          @click=${this._onDismissNotice}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>`;
    }
    return nothing;
  }

  _onDismissNotice = async () => {
    this._noticeDismissed = true;
    // The button is gone; keep keyboard focus nearby instead of losing it.
    await this.updateComplete;
    this.renderRoot.querySelector('[data-refresh]')?.focus();
  };

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
            data-refresh
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
    // A page that shows its data source shows the error instead of sample charts.
    if (this._data.live?.unavailable && this.constructor.showDataSource) {
      return html`
        <div class="mx-auto flex max-w-screen-2xl flex-col gap-4 p-4 lg:p-8">
          ${this._renderHeader(locale)} ${this._renderNotice()}
        </div>
      `;
    }
    const ctx = {locale, srLink: this._srLink, openSr: this._openSr, liveData: this.constructor.liveData};
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
