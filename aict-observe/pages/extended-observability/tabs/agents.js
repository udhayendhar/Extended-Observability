import {html} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import {i18n} from '@servicenow/aiux/aiux-services';
import '@servicenow/aiux/aiux-components-visualizations-spider';
import {section, card, chartBox, kpi} from '../components/ui.js';
import {
  seriesData,
  fmtNumber,
  fmtCompact,
  fmtCost,
  fmtPercent,
  fmtDuration,
  TONE,
  FMT
} from '../viz.js';
import {trendChart, donut, LEGEND_BOTTOM} from './chart-helpers.js';

/** Normalised 0–100 scores per agent for the capability radar. */
function radarData(d) {
  const axes = [
    {id: 'invocations', label: i18n.getMessage('Invocations'), get: a => a.srs},
    {id: 'tokens', label: i18n.getMessage('LLM tokens'), get: a => a.tokens},
    {id: 'cost', label: i18n.getMessage('Cost'), get: a => a.cost},
    {id: 'mcp', label: i18n.getMessage('MCP calls'), get: a => a.mcpCalls},
    {id: 'reliability', label: i18n.getMessage('Reliability'), get: a => 100 - a.errRate}
  ];
  const max = Object.fromEntries(
    axes.map(x => [x.id, Math.max(1e-9, ...d.agents.map(x.get))])
  );
  return seriesData(
    axes.map(x => ({id: x.id, label: x.label})),
    d.agents.map(a => ({
      key: a.key,
      label: a.name,
      values: axes.map(x => Math.round((x.get(a) / max[x.id]) * 100))
    })),
    {format: FMT.count}
  );
}

function stat(label, value, tone = '') {
  return html`
    <div class="rounded-box bg-base-200 p-2">
      <p class="text-xs uppercase tracking-wide text-text-secondary">${label}</p>
      <p class="font-mono text-sm font-semibold ${tone}">${value}</p>
    </div>
  `;
}

function agentCard(a, locale) {
  return card(html`
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-base font-semibold text-text-primary break-all">${a.name}</h3>
      <span class="aiux-badge aiux-badge-sm aiux-badge-soft aiux-badge-primary font-mono">
        ${i18n.getMessage('{0} invocations', [fmtNumber(a.srs, locale)])}
      </span>
    </div>
    <div class="grid grid-cols-2 gap-2">
      ${stat(i18n.getMessage('Completed'), fmtNumber(a.completed, locale), 'text-success')}
      ${stat(i18n.getMessage('Failed'), fmtNumber(a.failed, locale), a.failed ? 'text-error' : '')}
      ${stat(i18n.getMessage('LLM calls'), fmtNumber(a.llmCalls, locale))}
      ${stat(i18n.getMessage('Tokens'), fmtCompact(a.tokens, locale))}
      ${stat(i18n.getMessage('Cost'), fmtCost(a.cost, locale))}
      ${stat(i18n.getMessage('MCP calls'), fmtNumber(a.mcpCalls, locale))}
    </div>
    <dl class="grid grid-cols-3 gap-2 text-xs">
      <div>
        <dt class="text-text-secondary">${i18n.getMessage('Avg latency')}</dt>
        <dd class="font-mono">${fmtDuration(a.avgMs, locale)}</dd>
      </div>
      <div>
        <dt class="text-text-secondary">${i18n.getMessage('p90')}</dt>
        <dd class="font-mono">${fmtDuration(a.p90Ms, locale)}</dd>
      </div>
      <div>
        <dt class="text-text-secondary">${i18n.getMessage('Error rate')}</dt>
        <dd class="font-mono ${a.errRate > 10 ? 'text-error' : ''}">${fmtPercent(a.errRate, locale)}</dd>
      </div>
    </dl>
  `);
}

export function renderAgents(d, ctx) {
  const {locale} = ctx;
  const k = d.kpis;
  // Trends configured in IDB_DASHBOARD_WIDGETS.md read the live dataset.
  const L = d.live;

  return html`
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      ${section(
        'ag-status',
        i18n.getMessage('Invocation status'),
        i18n.getMessage('Completed · Failed · In progress'),
        card(
          chartBox(
            donut(
              [
                {id: 'completed', label: i18n.getMessage('Completed'), value: k.invCompleted},
                {id: 'failed', label: i18n.getMessage('Failed'), value: k.invFailed},
                {id: 'in_progress', label: i18n.getMessage('In progress'), value: k.invInProgress}
              ],
              {
                center: fmtNumber(k.agentInvocations, locale),
                centerLabel: i18n.getMessage('Invocations'),
                valueLabel: i18n.getMessage('Invocations'),
                colors: {completed: TONE.success, failed: TONE.error, in_progress: TONE.neutral}
              }
            )
          )
        )
      )}
      ${section(
        'ag-trend',
        i18n.getMessage('Agent invocation trend'),
        i18n.getMessage('Requests per agent per interval'),
        card(
          chartBox(
            trendChart(L, ctx, L.series.invocations)
          )
        ),
        'xl:col-span-2'
      )}
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      ${section(
        'ag-tokens',
        i18n.getMessage('Token usage trend'),
        i18n.getMessage('Tokens consumed per agent per interval'),
        card(
          chartBox(
            trendChart(L, ctx, L.series.agentTokens, {format: FMT.compact})
          )
        ),
        'xl:col-span-2'
      )}
      ${section(
        'ag-aggregate',
        i18n.getMessage('Aggregate stats'),
        '',
        html`<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
          ${kpi({
            label: i18n.getMessage('Total agent invocations'),
            value: fmtNumber(k.agentInvocations, locale),
            sub: i18n.getMessage('{0} agents', [fmtNumber(d.agents.length, locale)]),
            tone: 'info'
          })}
          ${kpi({
            label: i18n.getMessage('Total tokens consumed'),
            value: fmtCompact(k.tokensIn + k.tokensOut, locale),
            sub: i18n.getMessage('In {0} / out {1}', [
              fmtCompact(k.tokensIn, locale),
              fmtCompact(k.tokensOut, locale)
            ]),
            tone: 'info'
          })}
          ${kpi({
            label: i18n.getMessage('Avg LLM latency'),
            value: fmtDuration(k.avgLlmLatencyMs, locale),
            sub: i18n.getMessage('across LLM-calling agents'),
            tone: 'warning'
          })}
        </div>`
      )}
    </div>

    ${section(
      'ag-latency',
      i18n.getMessage('LLM / MCP latency trend'),
      i18n.getMessage('Average latency per agent per interval (ms)'),
      card(
        chartBox(
          trendChart(
            d,
            ctx,
            Object.entries(d.series.latency).map(([key, values]) => ({key, label: key, values})),
            {format: FMT.ms}
          )
        )
      )
    )}

    ${section(
      'ag-radar',
      i18n.getMessage('Agent capability radar'),
      i18n.getMessage('Normalized metrics — invocations · tokens · cost · MCP calls · reliability'),
      card(
        chartBox(
          html`<aiux-visualizations-spider
            .data=${radarData(d)}
            .legend=${LEGEND_BOTTOM}
          ></aiux-visualizations-spider>`,
          'h-96'
        )
      )
    )}

    ${section(
      'ag-details',
      i18n.getMessage('Agent details'),
      i18n.getMessage('Performance breakdown per agent'),
      html`<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        ${repeat(d.agents, a => a.key, a => agentCard(a, locale))}
      </div>`
    )}
  `;
}
