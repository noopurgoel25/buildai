import { escape } from './observation-display.js';

// Text entry guarantees the same calendar format on every phone and browser.
export function dateInput(id, value, disabled = false) {
  return `<input id="${id}" class="date-entry" type="text" inputmode="numeric" maxlength="10" placeholder="DD/MM/YYYY" value="${escape(value)}" aria-describedby="${id}-format" ${disabled ? 'disabled' : ''}><span class="visually-hidden" id="${id}-format">Use DD/MM/YYYY.</span>`;
}

// A phone's number keyboard has no slash key. Keep deletion and invalid drafts editable.
export function bindDateInput(input, onInput = () => {}) {
  input.addEventListener('input', event => {
    const raw = input.value;
    if (!event.inputType?.startsWith('delete') && /^[\d/]+$/.test(raw)) {
      const digits = raw.replaceAll('/', '');
      if (digits.length <= 8) {
        const before = raw.slice(0, input.selectionStart).replaceAll('/', '').length;
        input.value = [digits.slice(0,2), digits.slice(2,4), digits.slice(4,8)].filter(Boolean).join('/');
        const cursor = before + (before > 2 ? 1 : 0) + (before > 4 ? 1 : 0);
        input.setSelectionRange(cursor, cursor);
      }
    }
    onInput(event);
  });
}
