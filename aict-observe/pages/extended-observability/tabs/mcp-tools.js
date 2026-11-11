import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import '@servicenow/aiux/aiux-components-visualizations-matrix';
import {section, card, chartBox, barList} from '../components/ui.js';
import {matrixData, fmtNumber, fmtDuration, fmtPercent} from '../viz.js';
import {trendChart, donut} from './chart-helpers.js';

export function renderMcpTools(d, ctx) {
  const {locale} = ctx;
  // Widgets configured in IDB_DASHBOARD_WIDGETS.md read the live dataset.
  const L = d.live;
  const live = L.source === 'live';
  const top6 = L.tools.slice(0, 6);

  return html`
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      ${section(
        'mcp-trend',
        i18n.getMessage('MCP call volume trend'),
        i18n.getMessage('Total tool invocations and errors per interval'),
        card(
          chartBox(
            trendChart(L, ctx, [
              {key: 'calls', label: i18n.getMessage('Calls'), values: L.series.mcpCalls},
              // No error source is configured for live data.
              ...(live
                ? []
                : [{key: 'errors', label: i18n.getMessage('Errors'), values: d.series.mcpErrors}])
            ])
          )
        ),
        'xl:col-span-2'
      )}
      ${section(
        'mcp-share',
        i18n.getMessage('Tool volume share'),
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
      )}
    </div>

    ${section(
      'mcp-performance',
      i18n.getMessage('Tool performance'),
      i18n.getMessage('Calls · errors · avg latency — sorted by volume'),
      card(
        barList(
          live
            ? L.tools.map(t => ({
                id: t.id,
                label: t.label,
                value: t.calls,
                text: i18n.getMessage('{0} calls', [fmtNumber(t.calls, locale)])
              }))
            : d.tools.map(t => ({
                id: t.id,
                label: t.id,
                value: t.calls,
                text: i18n.getMessage('{0} calls · avg {1} · p90 {2}', [
                  fmtNumber(t.calls, locale),
                  fmtDuration(t.avgMs, locale),
                  fmtDuration(t.p90Ms, locale)
                ]),
                note: t.errRate > 0
                  ? i18n.getMessage('{0} err', [fmtPercent(t.errRate, locale)])
                  : '',
                tone: t.errRate > 10 ? 'error' : 'warning'
              })),
          {mono: true}
        )
      )
    )}

    ${section(
      'mcp-matrix',
      i18n.getMessage('Agent × tool call matrix'),
      i18n.getMessage('Cell = number of calls from that agent to that tool'),
      card(
        chartBox(
          html`<aiux-visualizations-matrix
            .data=${matrixData(
              L.matrix.tools.map(id => ({id, label: id})),
              L.matrix.agents.map(id => ({id, label: id})),
              L.matrix.cells.filter(c => L.matrix.tools.includes(c.x)),
              {
                xLabel: i18n.getMessage('Tool'),
                yLabel: i18n.getMessage('Agent'),
                valueLabel: i18n.getMessage('Calls')
              }
            )}
            labels="values"
            .legend=${{position: 'bottom'}}
          ></aiux-visualizations-matrix>`,
          'h-96'
        )
      )
    )}
  `;
}
