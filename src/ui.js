import { escape, updateFacts } from './observation-display.js';
import { connectedFacts } from './observation-groups.js';

export const logo = '<svg class="held-light" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7" fill="#E68057"/><path d="M6 22c2 9 10 12 14 12s12-3 14-12M12 21c1 5 5 7 8 7s7-2 8-7" fill="none" stroke="#A2574F" stroke-width="3" stroke-linecap="round"/></svg>';
const paths = {
  note: '<path d="M4 12h4l3-7 3 14 3-7h3"/>',
  measurement: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 9h8m-8 4h3"/>',
  care: '<path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 7h14v13H5ZM12 10v7m-3-3.5h6"/>',
  wellbeing: '<path d="M20 14.2A8.5 8.5 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z"/>',
  pencil: '<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-4-4L5 15z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/>',
  microphone: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
};
export function icon(name) { return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.note}</svg>`; }
export function personContext(person) {
  const initials = String(person.name).trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toUpperCase();
  return `<div class="patient-context"><span class="person-avatar" aria-hidden="true">${escape(initials)}</span><div><h2>${escape(person.name)}</h2><p>${escape(person.relationship)}</p></div></div>`;
}
export function warmNote(text, symbol='logo') { return `<div class="warm-note">${symbol==='logo'?logo:icon(symbol)}<p>${text}</p></div>`; }
export function categoryInfo(event) {
  const items = event.observations?.length ? event.observations : [event];
  const names = {symptom:'Symptoms', measurement:'Readings', medication_change:'Medication changes', doctor_visit:'Doctor visits', daily_wellbeing:'Daily wellbeing', appetite:'Appetite', other:'Notes', pending:'Notes'};
  const kinds = {measurement:'measurement',medication_change:'care',doctor_visit:'care',daily_wellbeing:'wellbeing',appetite:'wellbeing'};
  const types = [...new Set(items.map(item=>item.type || 'other'))];
  return {label:types.map(type=>names[type] || 'Notes').join(' & '), kind:types.length===1?(kinds[types[0]] || 'note'):'note'};
}
export function storyTitle(event) {
  const groups = connectedFacts(event), related = groups.find(group=>group.related);
  if (related) {
    // A title quotes the connection actually supplied, rather than inventing a cause.
    return event.relatedGroups?.find(group=>group.observationIds.every(id=>related.items.some(item=>item.id===id)))?.supportingWords || related.items.map(item=>item.event).join('; ');
  }
  const items=event.observations?.length?event.observations:[event];
  return items.length===1?items[0].event:`One note. ${items.length} details.`;
}
export function detailHeading(event){
  const groups=connectedFacts(event),count=groups.reduce((sum,group)=>sum+group.items.length,0);
  const number=['','One','Two','Three','Four','Five'][count] || String(count);
  return `One note. ${number} ${groups.length===1 && groups[0].related?'related ':''}${count===1?'detail':'details'}.`;
}
export function storyCard(event, editable=false) {
  const {label,kind}=categoryInfo(event);
  return `<article class="story-card"><div class="story-category">${icon(kind)}<span>${escape(label)}</span></div>${(event.observations?.length || 1)>1?`<h3 class="story-title">${escape(storyTitle(event))}</h3>`:''}${updateFacts(event)}${editable?`<button class="text-action story-change" id="change-update" type="button">${icon('pencil')}Change this update</button>`:''}</article>`;
}
export function recordTabs(active) { return `<nav class="record-tabs" aria-label="Your record"><button type="button" id="tab-timeline" ${active==='timeline'?'aria-current="page" disabled':''}>Timeline</button><button type="button" id="period-summary" ${active==='summary'?'aria-current="page" disabled':''}>Summary</button></nav>`; }
