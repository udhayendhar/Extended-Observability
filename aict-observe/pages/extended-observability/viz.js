import {isServer} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';

/**
 * Builders that turn plain arrays into the DataResponse shape consumed by the
 * aiux-visualizations-* components, plus locale-aware value formatters.
 */

// Semantic colors for charts. Chosen for >= 3:1 contrast on a white surface.
export const TONE = {
  success: '#2F9E44',
  error: '#D9363E',
  warning: '#C77700',
  neutral: '#5F6B7A',
  info: '#1C7CB5'
};

// ServiceNow language codes that are not valid BCP 47 tags.
const SN_LOCALE_TO_BCP47 = {pb: 'pt-BR', zt: 'zh-TW', fq: 'fr-CA', zh: 'zh-CN'};

/** User's display locale as a BCP 47 tag; undefined on the server (runtime default). */
export function resolveLocale() {
  if (isServer) return undefined;
  const lang = document.documentElement.lang || navigator.language;
  return SN_LOCALE_TO_BCP47[lang] ?? lang ?? undefined;
}

// --- Column formatting presets (visualization formatting schema) ----------

export const FMT = {
  count: {type: 'number', options: {}},
  compact: {
    type: 'number',
    options: {abbreviationEnabled: true, decimalPrecision: 0}
  },
  cost: {type: 'number', options: {decimalPrecision: 4, unit: '${0}'}},
  ms: {type: 'number', options: {unit: '{0} ms'}},
  percent: {type: 'number', options: {decimalPrecision: 1, unit: '{0}%'}}
};

// --- Low-level DataResponse helpers ----------------------------------------

function dimension(order, items, label, colors) {
  return {
    column: {
      type: 'categorical',
      meaning: 'dimension',
      order,
      label,
      elements: items.map(i => ({id: i.id, label: i.label}))
    },
    rendering: {
      role: 'grouping',
      presentation: {visualizationDefinition: {}},
      formatting: {type: 'string'},
      // Categorical rules pin a color to a specific element (slice/series).
      rules: colors
        ? Object.entries(colors).map(([id, color]) => ({
            operator: 'equal',
            operand: id,
            applies: {color}
          }))
        : []
    }
  };
}

function metric(order, groupedBy, label, formatting = FMT.count, rules = []) {
  return {
    column: {
      type: 'numerical',
      meaning: 'metric',
      order,
      dataShape: 'single',
      groupedBy,
      label
    },
    rendering: {
      role: 'value',
      presentation: {visualizationDefinition: {}},
      formatting,
      rules
    }
  };
}

/**
 * Every column gets a complete rendering entry: the visualization merge layer
 * only fills defaults for columns with no entry, and a partial entry crashes
 * some components (see aiux-visualizations-score determineFormat).
 */
function response(cols, data) {
  const columns = {};
  const rendering = {};
  for (const [key, c] of Object.entries(cols)) {
    columns[key] = c.column;
    rendering[key] = c.rendering;
  }
  return {metadata: {columns}, data, rendering: {columns: rendering}, interactions: {}};
}

// --- Public builders ---------------------------------------------------------

/**
 * One dimension, one metric: pie/donut slices or a single-series bar chart.
 * @param {{id: string, label: string, value: number}[]} items
 */
export function categoryData(items, {dimLabel, valueLabel, format, colors, rules} = {}) {
  return response(
    {
      key: dimension(0, items, dimLabel ?? '', colors),
      value: metric(1, ['key'], valueLabel ?? i18n.getMessage('Value'), format, rules)
    },
    items.map(i => [i.id, String(i.value)])
  );
}

/**
 * One dimension on the x axis and several metric series (trend lines,
 * grouped bars). `series[].values[i]` lines up with `categories[i]`.
 */
export function seriesData(categories, series, {dimLabel, format} = {}) {
  const cols = {x: dimension(0, categories, dimLabel ?? '')};
  series.forEach((s, n) => {
    cols[s.key] = metric(n + 1, ['x'], s.label, s.format ?? format);
  });
  const rows = categories.map((c, i) => [
    c.id,
    ...series.map(s => String(s.values[i] ?? 0))
  ]);
  return response(cols, rows);
}

/** Two dimensions and a value: heatmap cells. */
export function matrixData(xItems, yItems, cells, {xLabel, yLabel, valueLabel} = {}) {
  return response(
    {
      x: dimension(0, xItems, xLabel ?? ''),
      y: dimension(1, yItems, yLabel ?? ''),
      value: metric(2, ['x', 'y'], valueLabel ?? i18n.getMessage('Value'))
    },
    cells.map(c => [c.x, c.y, String(c.value)])
  );
}

/** Threshold color rules for a metric (last matching rule wins). */
export function thresholdRules(base, steps) {
  return [
    {applies: {color: base}},
    ...steps.map(([operand, color]) => ({
      operator: 'greater',
      operand: String(operand),
      applies: {color}
    }))
  ];
}

// --- Display formatters (locale-aware) ------------------------------------

export function fmtNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(value);
}

export function fmtCompact(value, locale) {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function fmtCost(value, locale) {
  if (!value) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 0.001 ? 5 : 4,
    maximumFractionDigits: value < 0.001 ? 5 : 4
  }).format(value);
}

export function fmtPercent(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(value / 100);
}

/** Milliseconds as ms / s / min, matching the screenshots (e.g. 1.48s, 4.7m). */
export function fmtDuration(ms, locale) {
  const nf = digits =>
    new Intl.NumberFormat(locale, {maximumFractionDigits: digits, minimumFractionDigits: digits});
  if (ms < 1000) return i18n.getMessage('{0}ms', [nf(0).format(ms)]);
  if (ms < 60000) return i18n.getMessage('{0}s', [nf(2).format(ms / 1000)]);
  return i18n.getMessage('{0}m', [nf(1).format(ms / 60000)]);
}

export function fmtDateTime(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function fmtTime(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}
