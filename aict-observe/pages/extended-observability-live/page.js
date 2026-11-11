import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import {withObservabilityDashboard} from '../extended-observability/dashboard.js';

/** Extended Observability dashboard (live data from sn_ai_observe_ai_span). */
@customElement('x-assro-aict-obser-extended-obs-live-page')
export default class ExtendedObservabilityLivePage extends withObservabilityDashboard(AIUXElement) {
  static basePath = '/extended-observability-live';

  static get heading() {
    return i18n.getMessage('Extended Observability (Live)');
  }

  static get subheading() {
    return i18n.getMessage('Monitor health, cost and performance from live AI span data');
  }

  static showDataSource = true;

  static liveData = true;

  static async loader(ctx) {
    return super.loader(ctx);
  }
}
