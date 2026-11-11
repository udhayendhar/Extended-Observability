import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import {withObservabilityDashboard} from './dashboard.js';

/** Extended Observability dashboard (sample data). */
@customElement('x-assro-aict-obser-extended-obs-page')
export default class ExtendedObservabilityPage extends withObservabilityDashboard(AIUXElement) {
  static basePath = '/extended-observability';

  static get heading() {
    return i18n.getMessage('Extended Observability');
  }

  static get subheading() {
    return i18n.getMessage('Monitor health, cost and performance');
  }

  static showDataSource = false;

  static liveData = false;

  static async loader(ctx) {
    return super.loader(ctx);
  }
}
