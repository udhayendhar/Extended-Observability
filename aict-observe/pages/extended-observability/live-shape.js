/**
 * The dashboard's data shape (`data.live`) built from the sample dataset.
 * Every tab reads `data.live`; in sample mode it comes only from here.
 */
export function sampleAsLive(d) {
  const k = d.kpis;
  const llmAgents = d.agents.filter(a => a.llmCalls > 0);
  const named = obj =>
    Object.entries(obj).map(([key, values], n) => ({key: `s${n}`, label: key, values}));
  return {
    source: 'sample',
    range: d.range,
    bucketMinutes: d.bucketMinutes,
    buckets: d.buckets,
    failed: [],
    kpis: {
      totalSrs: k.totalSrs,
      approved: k.approved,
      failed: k.failed,
      avgDurationMs: k.avgDurationMs,
      p95DurationMs: k.p95DurationMs,
      avgP90Ms: k.avgP90Ms,
      llmCalls: k.llmCalls,
      llmAgents: k.llmAgents,
      avgCost: k.cost / Math.max(1, k.llmCalls),
      cost: k.cost,
      tokensIn: k.tokensIn,
      tokensOut: k.tokensOut,
      totalTokens: k.tokensIn + k.tokensOut,
      spans: null
    },
    outcomes: [
      {id: 'approved', label: null, value: k.approved},
      {id: 'failed', label: null, value: k.failed},
      {id: 'in_progress', label: null, value: k.inProgress}
    ],
    agentCosts: llmAgents.map(a => ({id: a.key, label: a.name, value: a.cost})),
    agentTokens: llmAgents.map(a => ({id: a.key, label: a.name, value: a.tokens})),
    agentAvgTokens: llmAgents.map(a => ({
      id: a.key,
      label: a.name,
      value: Math.round(a.tokens / Math.max(1, a.llmCalls))
    })),
    agentErrors: d.agents.map(a => ({id: a.key, label: a.name, calls: a.srs, failed: a.failed, errRate: a.errRate})),
    models: d.models.map(m => ({
      id: m.id,
      calls: m.calls,
      cost: m.cost,
      avgMs: m.avgMs,
      p90Ms: m.p90Ms,
      tokensIn: m.tokensIn,
      tokensOut: m.tokensOut,
      tokens: m.tokensIn + m.tokensOut
    })),
    tools: d.tools.map(tool => ({id: tool.id, label: tool.id, calls: tool.calls})),
    matrix: d.matrix,
    srs: d.srs,
    spans: d.spans.map(span => ({...span, agent: span.agent ? (d.agents.find(a => a.key === span.agent)?.name ?? span.agent) : null})),
    series: {
      activity: d.series.srTotal,
      failed: d.series.srFailed,
      cost: d.series.cost,
      costConsumption: d.series.cost,
      tokensIn: d.series.tokensIn,
      tokensOut: d.series.tokensOut,
      tokensTotal: d.series.tokensIn.map((v, i) => v + d.series.tokensOut[i]),
      invocations: named(d.series.invocations),
      agentTokens: named(d.series.tokens),
      modelTokens: d.models.map((m, n) => ({key: `s${n}`, label: m.id, values: d.series.modelTokens[m.id]})),
      modelCalls: d.models.map((m, n) => ({key: `s${n}`, label: m.id, values: d.series.modelCalls[m.id]})),
      mcpCalls: d.series.mcpCalls
    }
  };
}
