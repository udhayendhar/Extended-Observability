import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {withObservabilitySrDetail} from '../../../extended-observability/sr-detail.js';

/** SR detail for Extended Observability (live data). */
@customElement('x-assro-aict-obser-extended-obs-live-sr-page')
export default class ExtendedObservabilityLiveSrPage extends withObservabilitySrDetail(AIUXElement) {
  static basePath = '/extended-observability-live';

  static showDataSource = true;

  static liveData = true;

  static async loader(ctx) {
    return super.loader(ctx);
  }
}
