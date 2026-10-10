export function journeyProgress(labels, current) {
  return `<nav class="journey" aria-label="Update progress"><ol>${labels.map((label,index)=>`<li class="${index===current?'current':index<current?'complete':''}" ${index===current?'aria-current="step"':''}><span>${label}</span></li>`).join('')}</ol></nav>`;
}
