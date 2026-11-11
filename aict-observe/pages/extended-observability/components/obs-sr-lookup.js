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
@customElement('x-assro-aict-obser-obs-sr-lookup')
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
            <x-assro-aict-obser-obs-data-table
              .columns=${columns}
              .rows=${this._filtered()}
              .rowKey=${s => s.number}
              caption=${i18n.getMessage('All service requests')}
              sort-key="date"
              page-size="25"
            ></x-assro-aict-obser-obs-data-table>
          </div>
        </section>
      </div>
    `;
  }
}
