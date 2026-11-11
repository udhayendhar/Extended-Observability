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
