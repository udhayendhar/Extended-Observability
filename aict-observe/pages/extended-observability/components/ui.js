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
