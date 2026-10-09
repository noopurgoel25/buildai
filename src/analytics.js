import { createRecordId } from './record-id.js';
export const bucket=count=>count===0?'0':count<=2?'1-2':count<=10?'3-10':count<=50?'11-50':'51+';
let session=null,enabled=true,anonymousId=null,generation=0,ready=Promise.resolve();
const getStored=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const putStored=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
enabled=getStored('carenama.analytics')!=='off';
function identity(){if(!anonymousId){anonymousId=getStored('carenama.analytics-id')||createRecordId();putStored('carenama.analytics-id',anonymousId);}return anonymousId;}
export function resetAnalytics(){generation++;anonymousId=createRecordId();putStored('carenama.analytics-id',anonymousId);}
export function configureAnalytics(next){
  if(!session&&!next.isAuthenticated&&getStored('carenama.analytics-scope')==='account')resetAnalytics();
  const changed=session?.isAuthenticated!==next.isAuthenticated;
  session=next;
  if(changed&&next.isAuthenticated){
    const own=generation;
    ready=(async()=>{try{const preference=await next.getAnalyticsPreference?.();if(own!==generation)return;
      // Carry an explicit browser choice once. Thereafter the account setting is authoritative across devices.
      const browserOff=getStored('carenama.analytics-scope')!=='account'&&getStored('carenama.analytics')==='off';
      if(browserOff&&preference!==false)await next.setAnalyticsPreference?.({enabled:false,anonymousId:identity()});
      enabled=!browserOff&&preference!==false;putStored('carenama.analytics',enabled?'on':'off');putStored('carenama.analytics-scope','account');
    }catch{enabled=false;}})();
  }else if(!next.isAuthenticated)ready=Promise.resolve();
}
export function track(event,properties={}){
  const current=session,own=generation,id=identity();
  // Send before the first-save request; the server still checks the account opt-out.
  if(event==='signin_completed'){if(enabled)void current?.trackAnalytics?.({anonymousId:id,event,properties}).catch(()=>{});return;}
  void ready.then(()=>{if(enabled&&current===session&&own===generation)return current?.trackAnalytics?.({anonymousId:id,event,properties});}).catch(()=>{});
}
export function analyticsEnabled(){return enabled;}
export function analyticsReady(){return ready;}
export async function setAnalytics(enabledNext,current=session){
  const id=identity();
  // Stop immediately while the server confirms the change, including queued callbacks.
  const previous=enabled;enabled=false;
  try{if(!current?.setAnalyticsPreference)throw new Error('Privacy settings unavailable.');await current.setAnalyticsPreference({enabled:enabledNext,anonymousId:id});enabled=enabledNext;putStored('carenama.analytics',enabled?'on':'off');putStored('carenama.analytics-scope',current.isAuthenticated?'account':'browser');}
  catch(error){enabled=previous;throw error;}
}
