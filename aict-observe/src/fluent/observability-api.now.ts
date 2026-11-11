import {RestApi} from '@servicenow/sdk/core';
import {trends} from '../server/observability-trends.js';

/**
 * Server-side aggregation for the Extended Observability dashboard
 * (/extended-observability).
 * GET /api/x_assro_aict_obser/observability/trends
 */
RestApi({
  $id: Now.ID['observability-api'],
  name: 'Observability',
  serviceId: 'observability',
  shortDescription: 'Aggregated AI span data for the Platform Observability dashboard',
  produces: 'application/json',
  routes: [
    {
      $id: Now.ID['observability-api-trends'],
      name: 'trends',
      path: '/trends',
      method: 'GET',
      script: trends,
      shortDescription:
        'Time-bucketed series, latency percentiles, SR first-seen/outcome and recent LLM spans for a time window',
      parameters: [
        {$id: Now.ID['observability-api-trends-hours'], name: 'hours', shortDescription: 'Window length in hours; 0 = all time'},
        {$id: Now.ID['observability-api-trends-start'], name: 'start', required: true, shortDescription: 'First bucket start (epoch ms, UTC)'},
        {$id: Now.ID['observability-api-trends-step'], name: 'step', required: true, shortDescription: 'Bucket length (ms)'},
        {$id: Now.ID['observability-api-trends-count'], name: 'count', required: true, shortDescription: 'Number of buckets'}
      ]
    }
  ]
});
