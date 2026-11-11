import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {withObservabilitySrDetail} from '../../sr-detail.js';

/** SR detail for Extended Observability (sample data). */
@customElement('x-assro-aict-obser-extended-obs-sr-page')
export default class ExtendedObservabilitySrPage extends withObservabilitySrDetail(AIUXElement) {
  static basePath = '/extended-observability';

  static showDataSource = false;

  static liveData = false;

  static async loader(ctx) {
    return super.loader(ctx);
  }
}
