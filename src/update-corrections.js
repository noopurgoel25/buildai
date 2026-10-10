import { createRecordId } from './record-id.js';

// Unchanged wording retains the caregiver's dates, IDs, evidence and corrections.
export function reconcileCorrections(previous, interpreted, originalText) {
  const available = [...previous];
  return interpreted.map(next => {
    const index=available.findIndex(old=>old.event.trim()===next.event.trim());
    if(index>=0)return structuredClone(available.splice(index,1)[0]);
    const item={...structuredClone(next),id:createRecordId(),supportingWords:originalText,type:'pending',edited:true,confirmed:false};
    delete item.symptomName;delete item.measurement;
    return item;
  });
}
