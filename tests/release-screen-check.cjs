// Inspect the running app, including real computed colours and touch areas.
// This supplements flow tests; it is not a claim of a complete accessibility audit.
async function checkReleaseScreen(page, name) {
  const issues=[];
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:844});
    const found=await page.evaluate(()=>{
      const issues=[],root=document.querySelector('dialog[open]')??document.body;
      const visible=element=>!!element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden';
      const rgb=value=>(value.match(/[\d.]+/g)??[]).map(Number);
      const background=element=>{
        for(let current=element;current;current=current.parentElement){const value=rgb(getComputedStyle(current).backgroundColor);if(value.length===3||value[3]===1)return value;}
        return [255,255,255];
      };
      const luminance=colour=>colour.slice(0,3).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
      const label=element=>(element.getAttribute('aria-label')||element.textContent||element.id||element.tagName).trim().slice(0,65);
      if(document.documentElement.scrollWidth>innerWidth)issues.push('horizontal overflow');
      for(const element of root.querySelectorAll('button,a[href],input:not([type=hidden]),textarea,select,summary')) {
        if(!visible(element)||element.disabled||element.closest('[aria-disabled=true]'))continue;
        const target=element.matches('input[type=checkbox]')?element.closest('label')??element:element,box=target.getBoundingClientRect();
        if(box.height<43.5||box.width<43.5)issues.push(`small touch area: ${label(element)} (${Math.round(box.width)} × ${Math.round(box.height)})`);
      }
      for(const element of root.querySelectorAll('h1,h2,h3,p,span,label,button,a,summary,dt,dd,input,textarea')) {
        if(!visible(element)||element.closest('button:disabled,[aria-disabled=true]')||element.classList.contains('visually-hidden'))continue;
        if(!element.matches('input,textarea')&&![...element.childNodes].some(node=>node.nodeType===3&&node.textContent.trim()))continue;
        const style=getComputedStyle(element),foreground=luminance(rgb(style.color)),back=luminance(background(element));
        const contrast=(Math.max(foreground,back)+.05)/(Math.min(foreground,back)+.05),minimum=parseFloat(style.fontSize)>=24?3:4.5;
        if(contrast+.01<minimum)issues.push(`low text contrast: ${label(element)} (${contrast.toFixed(2)}:1)`);
      }
      return issues;
    });
    issues.push(...found.map(issue=>`${name} at ${width}px: ${issue}`));
  }
  return [...new Set(issues)];
}
module.exports={checkReleaseScreen};
