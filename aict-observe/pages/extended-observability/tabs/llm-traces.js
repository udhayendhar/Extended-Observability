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
    : html`<x-assro-aict-obser-obs-data-table
        .columns=${columns}
        .rows=${L.spans}
        .rowKey=${(s, i) => `${s.time.getTime()}-${i}`}
        caption=${i18n.getMessage('LLM call spans')}
        sort-key="time"
        page-size="25"
      ></x-assro-aict-obser-obs-data-table>`;

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
