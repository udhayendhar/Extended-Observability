import {isServer} from 'lit';
import {i18n} from '@servicenow/aiux/aiux-services';

/** Sets the browser tab title for the current page (WCAG 2.4.2). */
export function setDocumentTitle(pageTitle) {
  if (isServer) return;
  document.title = i18n.getMessage('{0} | {1}', [
    pageTitle,
    i18n.getMessage('Extended Observability')
  ]);
}
