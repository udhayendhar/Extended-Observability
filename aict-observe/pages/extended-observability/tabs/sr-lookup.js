import {html} from 'lit';
import '../components/obs-sr-lookup.js';

export function renderSrLookup(d, ctx) {
  return html`<x-assro-aict-obser-obs-sr-lookup
    .data=${d}
    .srs=${d.live.srs}
    .locale=${ctx.locale}
    .srLink=${ctx.srLink}
    .openSr=${ctx.openSr}
  ></x-assro-aict-obser-obs-sr-lookup>`;
}
