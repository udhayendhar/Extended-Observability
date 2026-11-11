import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import {section, card, chartBox, kpiRow} from '../components/ui.js';
import {fmtNumber, fmtCompact, fmtPercent, fmtDuration, thresholdRules, TONE, FMT} from '../viz.js';
import {trendChart, donut, barChart} from './chart-helpers.js';

export function renderPerformance(d, ctx) {
  const {locale} = ctx;
  // Every section reads the live dataset (sample-shaped when the instance is unavailable).
  const L = d.live;
  const k = L.kpis;
  const errPct = (k.failed / Math.max(1, k.totalSrs)) * 100;

  return html`
    ${kpiRow([
      {
        label: i18n.getMessage('Average latency (p90)'),
        value: k.avgP90Ms == null ? '—' : fmtDuration(k.avgP90Ms, locale),
        sub: i18n.getMessage('across all models'),
        tone: 'info'
      },
      {
        label: i18n.getMessage('Total LLM calls'),
        value: fmtNumber(k.llmCalls, locale),
        sub: i18n.getMessage('{0} SRs', [fmtNumber(k.totalSrs, locale)])
      },
      {
        label: i18n.getMessage('Total errors'),
        value: fmtNumber(k.failed, locale),
        sub: i18n.getMessage('failed SRs ({0})', [fmtPercent(errPct, locale)]),
        tone: 'warning'
      },
      {
        label: i18n.getMessage('Error rate'),
        value: fmtPercent(errPct, locale),
        sub: i18n.getMessage('{0} total SRs', [fmtNumber(k.totalSrs, locale)]),
        tone: 'error'
      }
    ])}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'pf-model-calls',
        i18n.getMessage('LLM calls per model'),
        i18n.getMessage('Call volume per model over time'),
        card(chartBox(trendChart(L, ctx, L.series.modelCalls, {type: 'line'})))
      )}
      ${section(
        'pf-throughput',
        i18n.getMessage('Throughput'),
        i18n.getMessage('Spans processed per interval'),
        card(
          chartBox(
            trendChart(
              L,
              ctx,
              [{key: 'spans', label: i18n.getMessage('Spans'), values: L.series.activity}],
              {type: 'line'}
            )
          )
        )
      )}
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      ${section(
        'pf-errors',
        i18n.getMessage('Error rate by agent'),
        i18n.getMessage('Failure % — red above 10% · amber above 5% · blue at or below 5%'),
        card(
          chartBox(
            barChart(
              L.agentErrors.map(a => ({id: a.id, label: a.label, value: Number(a.errRate.toFixed(1))})),
              {
                valueLabel: i18n.getMessage('Error rate'),
                format: FMT.percent,
                rules: thresholdRules(TONE.info, [
                  [5, TONE.warning],
                  [10, TONE.error]
                ])
              }
            ),
            'h-80'
          )
        )
      )}
      ${section(
        'pf-tokens',
        i18n.getMessage('Model usage by token count'),
        i18n.getMessage('Total tokens (input + output) per model'),
        card(
          chartBox(
            donut(
              L.models.map(m => ({id: m.id, label: m.id, value: m.tokensIn + m.tokensOut})),
              {
                center: fmtCompact(L.models.reduce((s, m) => s + m.tokensIn + m.tokensOut, 0), locale),
                centerLabel: i18n.getMessage('Tokens'),
                valueLabel: i18n.getMessage('Tokens'),
                format: FMT.compact
              }
            ),
            'h-80'
          )
        )
      )}
    </div>

    ${section(
      'pf-activity',
      i18n.getMessage('Agent activity over time'),
      i18n.getMessage('Invocations per agent per interval'),
      card(chartBox(trendChart(L, ctx, L.series.invocations, {type: 'areaspline'})))
    )}
  `;
}
