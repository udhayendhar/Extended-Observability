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
@customElement('x-assro-aict-obser-obs-data-table')
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
