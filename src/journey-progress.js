export function journeyProgress(labels, current) {
  return `<nav class="journey" aria-label="Update progress"><ol>${labels.map((label,index)=>`<li class="${index===current?'current':index<current?'complete':''}" ${index===current?'aria-current="step"':''}><span class="journey-marker" aria-hidden="true">${index<current?'<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>':index+1}</span><span>${label}</span></li>`).join('')}</ol></nav>`;
}
