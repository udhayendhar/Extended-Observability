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
      ${ctx.liveData
        ? section(
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
          )
        : section(
            'fo-vendor',
            i18n.getMessage('Cost by vendor'),
            i18n.getMessage('LLM spend per model vendor'),
            card(
              chartBox(
                donut(
                  // The sample data only has Amazon Bedrock spend; the other vendors stay in the legend.
                  [
                    {id: 'amazon', label: 'Amazon', value: cost},
                    {id: 'servicenow', label: 'ServiceNow', value: 0},
                    {id: 'google', label: 'Google', value: 0},
                    {id: 'microsoft', label: 'Microsoft', value: 0}
                  ],
                  {center: fmtCost(cost, locale), valueLabel: i18n.getMessage('Cost'), format: FMT.cost}
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
