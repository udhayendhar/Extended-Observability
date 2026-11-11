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
