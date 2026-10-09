// Guidance stays in the real journey; examples never become a caregiver's draft.
export function noteOrientation(signedIn = false) {
  return `<ol class="note-orientation" aria-label="How a health note works">
    <li><strong>Say</strong><span>Speak or type what happened.</span></li>
    <li><strong>Check</strong><span>Review the details and change anything.</span></li>
    <li><strong>Keep</strong><span>${signedIn ? 'Save to their record.' : 'Save with an email code.'}</span></li>
  </ol>`;
}

export function noteExamples() {
  return `<div class="note-examples">
    <p>For example, you can say or type:</p>
    <ul><li>“Felt dizzy after lunch today.”</li><li>“BP was 142/88 this morning.”</li><li>“Slept better last night.”</li></ul>
  </div>`;
}
