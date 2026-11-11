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
