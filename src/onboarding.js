// Guidance stays in the real journey; examples never become a caregiver's draft.
export function noteOrientation(signedIn = false) {
  return `<ol class="note-orientation" aria-label="How a health note works">
    <li><strong>Say it</strong><span>Voice or text</span></li>
    <li><strong>Check it</strong><span>You stay in control</span></li>
    <li><strong>Keep it</strong><span>Ready for your visit</span></li>
  </ol>`;
}

export function noteExamples() {
  return `<div class="note-examples">
    <p>You could mention&hellip;</p>
    <ul><li>“Felt dizzy after lunch today.”</li><li>“BP was 142/88 this morning.”</li><li>“Slept better last night.”</li></ul>
  </div>`;
}
