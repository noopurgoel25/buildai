// Display only connections supported by the note. Legacy and invalid metadata stay flat.
export function connectedFacts(event) {
  const items = event.observations || [{event:event.event,when:event.when,evidence:event.evidence}];
  const flat = () => items.map(item => ({items:[item],related:false}));
  const original = event.originalText || event.text || event.event || '';
  if (!Array.isArray(event.relatedGroups) || !event.relatedGroups.length || event.relatedGroups.length > 10) return flat();
  if (new Set(items.map(item => item.id)).size !== items.length) return flat();
  const byId = new Map(items.map(item => [item.id,item]));
  const assigned = new Map();
  for (const group of event.relatedGroups) {
    if (!group || !Array.isArray(group.observationIds) || group.observationIds.length < 2 || group.observationIds.length > 20 ||
      typeof group.supportingWords !== 'string' || !original.includes(group.supportingWords) ||
      !/\b(?:after|before|but|with|alongside|followed|following|then)\b/i.test(group.supportingWords)) return flat();
    const connected = {items:items.filter(item => group.observationIds.includes(item.id)),related:true};
    for (const id of group.observationIds) {
      const item = byId.get(id);
      if (!item || item.edited || assigned.has(id) || !item.supportingWords || !group.supportingWords.includes(item.supportingWords)) return flat();
      assigned.set(id,connected);
    }
  }
  const shown = new Set();
  return items.flatMap(item => {
    const group = assigned.get(item.id);
    if (!group) return [{items:[item],related:false}];
    if (shown.has(group)) return [];
    shown.add(group);return [group];
  });
}
