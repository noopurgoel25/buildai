import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './style.css';

const app = document.querySelector('#app');
// Draft identity stays in memory until authentication is added in milestone 6.
const patient = { name: '', relationship: '' };
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function render() {
  const setup = location.hash === '#patient-setup';
  const capture = location.hash === '#capture';
  if (capture && (!patient.name.trim() || !patient.relationship.trim())) {
    location.replace('#patient-setup');
    return;
  }
  app.innerHTML = capture ? `
    <section class="screen setup" aria-labelledby="title">
      <a class="back" href="#patient-setup">Back</a>
      <div class="patient-context"><h2>${escapeHtml(patient.name)}</h2><p>${escapeHtml(patient.relationship)}</p></div>
      <h1 id="title" tabindex="-1">What happened?</h1>
      <p class="milestone-note">Voice and text capture are coming next.</p>
    </section>` : setup ? `
    <section class="screen setup" aria-labelledby="title">
      <a class="back" href="#">Back</a>
      <div class="intro">
        <h1 id="title" tabindex="-1">Who are you keeping track of?</h1>
        <form id="patient-form" novalidate>
          <div class="field"><label for="patient-name">Their name</label><input id="patient-name" name="name" autocomplete="off" value="${escapeHtml(patient.name)}" aria-describedby="name-error" required><p id="name-error" class="error" hidden></p></div>
          <div class="field"><label for="relationship">Your relationship to them</label><input id="relationship" name="relationship" autocomplete="off" value="${escapeHtml(patient.relationship)}" aria-describedby="relationship-hint relationship-error" required><p id="relationship-hint" class="hint">For example, daughter, son or partner.</p><p id="relationship-error" class="error" hidden></p></div>
          <p class="reassurance">No medical profile to fill out. Just these two details.</p>
          <p class="hint temporary">These details are temporary until you sign up. Refreshing this page will clear them.</p>
          <button class="primary" type="submit">Continue</button>
        </form>
      </div>
    </section>` : `
    <section class="screen welcome" aria-labelledby="title">
      <div class="intro">
        <h1 id="title" tabindex="-1">Remember what happens between doctor visits.</h1>
        <p>Tell us what happened to someone you care for. We'll remember it for the next appointment.</p>
      </div>
      <div class="memory" aria-hidden="true">
        <span class="memory-line"></span>
        <span class="memory-dot first"></span>
        <span class="memory-dot second"></span>
        <span class="memory-dot third"></span>
        <span class="note note-first"><span></span><span></span></span>
        <span class="note note-second"><span></span><span></span></span>
        <span class="note note-third"><span></span><span></span></span>
      </div>
      <a class="primary" href="#patient-setup">Get started</a>
    </section>`;
  if (setup || capture) document.querySelector('h1').focus();
  if (setup) {
    const form = document.querySelector('#patient-form');
    form.addEventListener('input', (event) => {
      patient[event.target.name] = event.target.value;
      event.target.removeAttribute('aria-invalid');
      document.querySelector(event.target.name === 'name' ? '#name-error' : '#relationship-error').hidden = true;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let firstInvalid;
      for (const [key, id, message] of [['name', 'patient-name', 'Enter their name.'], ['relationship', 'relationship', 'Enter your relationship to them.']]) {
        const input = document.getElementById(id);
        const error = document.getElementById(`${key}-error`);
        const invalid = !patient[key].trim();
        error.textContent = invalid ? message : '';
        error.hidden = !invalid;
        input.setAttribute('aria-invalid', String(invalid));
        if (invalid && !firstInvalid) firstInvalid = input;
      }
      if (firstInvalid) { firstInvalid.focus(); return; }
      patient.name = patient.name.trim();
      patient.relationship = patient.relationship.trim();
      location.hash = '#capture';
    });
  }
}

window.addEventListener('hashchange', render);
render();
