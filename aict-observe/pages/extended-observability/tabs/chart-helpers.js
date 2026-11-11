import {html} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';
import '@servicenow/aiux/aiux-components-visualizations-axis';
import '@servicenow/aiux/aiux-components-visualizations-composition';
import {seriesData, categoryData, TONE, FMT} from '../viz.js';

export const LEGEND_BOTTOM = {visible: true, position: 'bottom'};
export const NO_LEGEND = {visible: false};

/**
 * X-axis categories for the time buckets, labelled in the user's locale.
 * `d` is any dataset with `buckets` and `bucketMinutes` (sample or live).
 */
export function timeCategories(d, locale) {
  const spanHours = (d.buckets.length * d.bucketMinutes) / 60;
  const opts =
    d.bucketMinutes < 60
      ? {hour: 'numeric', minute: '2-digit'}
      : d.bucketMinutes >= 1440
        ? {year: 'numeric', month: 'short', day: 'numeric'}
        : spanHours <= 48
          ? {hour: 'numeric'}
          : {month: 'short', day: 'numeric', hour: 'numeric'};
  const fmt = new Intl.DateTimeFormat(locale, opts);
  return d.buckets.map(b => ({id: b.id, label: fmt.format(b.date)}));
}

/**
 * Multi-series trend over the time buckets. While a live dataset's trend data is
 * still loading (`d.trendsPending`), shows a placeholder instead.
 */
export function trendChart(d, ctx, series, {type = 'spline', format, yTitle} = {}) {
  if (d.trendsPending) {
    return html`
      <div class="aiux-skeleton h-full w-full" role="img" aria-label=${i18n.getMessage('Loading trend data')}></div>
    `;
  }
  const data = seriesData(timeCategories(d, ctx.locale), series, {
    dimLabel: i18n.getMessage('Time'),
    format
  });
  return html`
    <aiux-visualizations-axis
      type=${type}
      .data=${data}
      .legend=${series.length > 1 ? LEGEND_BOTTOM : NO_LEGEND}
      .axes=${{
        xAxis: {column: 'x'},
        yAxis: [{columns: series.map(s => s.key), title: yTitle}]
      }}
    ></aiux-visualizations-axis>
  `;
}

/** Donut with a custom centre value. */
export function donut(items, {center, centerLabel, valueLabel, format, colors}) {
  return html`
    <aiux-visualizations-composition
      type="donut"
      .data=${categoryData(items, {valueLabel, format, colors})}
      .legend=${LEGEND_BOTTOM}
      .centerContent=${{mode: 'custom', value: center, label: centerLabel ?? '', size: 'small'}}
      tooltip-show-percentage
    ></aiux-visualizations-composition>
  `;
}

/** Single-series bar chart (horizontal by default). */
export function barChart(items, {type = 'bar', valueLabel, format, rules, colors} = {}) {
  return html`
    <aiux-visualizations-axis
      type=${type}
      .data=${categoryData(items, {valueLabel, format, rules, colors})}
      .legend=${NO_LEGEND}
    ></aiux-visualizations-axis>
  `;
}

/** Grouped columns: one category per item, one series per metric. */
export function groupedBars(categories, series, {type = 'column', format} = {}) {
  return html`
    <aiux-visualizations-axis
      type=${type}
      .data=${seriesData(categories, series, {format})}
      .legend=${LEGEND_BOTTOM}
    ></aiux-visualizations-axis>
  `;
}

export function outcomeLabels() {
  return {
    approved: i18n.getMessage('approved'),
    failed: i18n.getMessage('failed'),
    in_progress: i18n.getMessage('in progress')
  };
}

export const OUTCOME_COLORS = {
  approved: TONE.success,
  failed: TONE.error,
  in_progress: TONE.neutral
};

export {FMT};
