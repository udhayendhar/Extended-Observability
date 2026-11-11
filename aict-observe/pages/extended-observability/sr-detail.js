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
    _loading: {state: true},
    _error: {state: true}
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
    let error = null;
    if (this.constructor.liveData) {
      try {
        sr = await loadLiveSr(srNumber);
      } catch (e) {
        sr = null;
        error = e?.message || String(e);
      }
    } else {
      // Fill in after the current render so the first client render matches
      // the server's skeleton.
      await this.updateComplete;
    }
    if (id !== this._loadId) return;
    this._error = error;
    // A page that shows its data source shows the error instead of sample values.
    if (error && this.constructor.showDataSource) {
      this._sr = null;
      this._loading = false;
      return;
    }
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

    if (this._error && this.constructor.showDataSource) {
      return html`
        <div class="mx-auto flex max-w-5xl flex-col gap-4 p-4 lg:p-8">
          ${back}
          <div class="aiux-alert aiux-alert-error flex-col items-start" role="alert">
            <p class="font-semibold">${i18n.getMessage('Live data for {0} could not be loaded.', [srNumber ?? ''])}</p>
            <p class="break-words font-mono text-sm">${this._error}</p>
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
