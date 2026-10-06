import { toWav } from './audio.js';

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const BUSY = 'Busy right now. Try again in a few minutes.';

export function mountCapture(root, patient, draft) {
  let state = draft.editDraft ? 'editing' : draft.interpretation ? 'ready' : 'idle';
  let error = '';
  let recorder, stream, timer, startedAt;
  let disposed = false;
  let recordingGeneration = 0;
  let retryStep = '';
  let requestController;
  let editDraft = draft.editDraft;

  function releaseMic() {
    clearInterval(timer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function cancelRecording() {
    recordingGeneration++;
    if (recorder?.state === 'recording') recorder.stop();
    releaseMic();
  }

  async function request(path, body, type = 'application/json') {
    requestController = new AbortController();
    const response = await fetch(`/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': type }, body,
      signal: AbortSignal.any([requestController.signal, AbortSignal.timeout(90_000)]),
    });
    const result = await response.json().catch(() => { throw new Error(BUSY); });
    if (!response.ok) throw new Error(result.error || BUSY);
    return result;
  }

  function fail(cause) {
    if (disposed) return;
    state = 'idle';
    error = cause instanceof Error ? cause.message : BUSY;
    if (error === 'Failed to fetch' || /abort|timeout/i.test(error)) error = BUSY;
    draw();
  }

  async function interpret() {
    retryStep = 'interpret';
    state = 'understanding';
    draw();
    try {
      const result = await request('interpret', JSON.stringify({
        text: draft.text, source: draft.source, patient: { ...patient },
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }));
      if (disposed) return;
      draft.interpretation = result;
      state = 'ready';
      retryStep = '';
      draw();
      root.querySelector('h2')?.focus();
    } catch (cause) { fail(cause); }
  }

  async function transcribe() {
    retryStep = 'transcribe';
    state = 'transcribing';
    error = '';
    draw();
    try {
      const result = await request('transcribe', draft.audio, 'audio/wav');
      if (disposed) return;
      draft.text = result.text;
      draft.originalText = result.text;
      draft.clarifications = [];
      draft.clarificationAnswer = '';
      draft.source = 'voice';
      await interpret();
    } catch (cause) { fail(cause); }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      fail(new Error('Voice recording is unavailable in this browser. Type your update instead.'));
      return;
    }
    state = 'permission'; error = ''; retryStep = ''; draw();
    const generation = ++recordingGeneration;
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposed || state !== 'permission' || generation !== recordingGeneration) { mic.getTracks().forEach((track) => track.stop()); return; }
      stream = mic;
      const chunks = [];
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { cancelRecording(); fail(new Error('Recording failed. Try again or type your update instead.')); };
      recorder.onstop = async () => {
        releaseMic();
        if (generation !== recordingGeneration || disposed) return;
        state = 'processing'; draw();
        try {
          const wav = await toWav(new Blob(chunks, { type: recorder.mimeType }));
          if (disposed || generation !== recordingGeneration) return;
          draft.audio = wav; draft.interpretation = null;
          await transcribe();
        } catch (cause) {
          fail(cause.name === 'EncodingError'
            ? new Error('I couldn’t hear anything. Try again or type it instead.')
            : cause);
        }
      };
      recorder.start();
      startedAt = performance.now();
      state = 'recording'; draw();
      timer = setInterval(() => {
        if (performance.now() - startedAt >= 30_000) {
          cancelRecording();
          fail(new Error('Recording stopped at the 30-second limit. Please record a shorter update; this recording was not sent.'));
        } else {
          const label = root.querySelector('#recording-time');
          if (label) label.textContent = `${Math.floor((performance.now() - startedAt) / 1000)} / 30 seconds`;
        }
      }, 100);
    } catch (cause) {
      releaseMic();
      if (state !== 'permission' || generation !== recordingGeneration) return;
      fail(new Error(cause.name === 'NotAllowedError'
        ? 'Microphone permission is required to record. Allow it in your browser, or type your update below.'
        : 'Couldn’t access your microphone. Try again or type your update below.'));
    }
  }

  async function submitText(event) {
    event.preventDefault();
    draft.text = root.querySelector('textarea').value;
    if (!draft.text.trim()) { fail(new Error('Type what happened before continuing.')); root.querySelector('textarea').focus(); return; }
    draft.source = 'text'; draft.interpretation = null;
    error = ''; retryStep = 'text'; state = 'submitting'; draw();
    try {
      const result = await request('capture-text', JSON.stringify({ text: draft.text }));
      if (disposed) return;
      draft.text = result.text;
      draft.originalText = result.text;
      draft.clarifications = [];
      draft.clarificationAnswer = '';
      await interpret();
    } catch (cause) { fail(cause); }
  }

  function draw() {
    if (disposed) return;
    const busy = ['processing', 'transcribing', 'submitting', 'understanding'].includes(state);
    const recording = state === 'recording';
    const permission = state === 'permission';
    const result = draft.interpretation;
    const clarified = draft.clarifications?.length && !result?.edited;
    const timingClarified = clarified && draft.clarifications.some(item => /day|date|when|time/i.test(item.question));
    if (state === 'editing') {
      root.innerHTML = `<div class="capture-result">
        <h2 tabindex="-1">Edit what happened</h2>
        <p>Keep the details you know. Leave uncertain timing as written.</p>
        <form id="edit-event" novalidate>
          <div class="field"><label for="event-description">What happened</label><textarea id="event-description" rows="4" maxlength="5000">${escape(editDraft.event)}</textarea></div>
          <div class="field"><label for="event-time">When</label><input id="event-time" maxlength="5000" value="${escape(editDraft.when)}"><p class="hint">For example, yesterday at 10 a.m., or Not specified.</p></div>
          <div class="field"><label for="event-evidence">How do you know?</label><select id="event-evidence">${['Not specified', 'Measured', 'Patient-reported', 'Caregiver-observed'].map(value => `<option ${value === editDraft.evidence ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
          ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
          <button class="primary" type="submit">Apply changes</button>
          <button class="secondary" id="cancel-edit" type="button">Cancel editing</button>
        </form>
        <p class="hint">These changes stay in this open page. Nothing has been saved.</p>
      </div>`;
      root.querySelector('#event-description').oninput = event => { editDraft.event = event.target.value; };
      root.querySelector('#event-time').oninput = event => { editDraft.when = event.target.value; };
      root.querySelector('#event-evidence').onchange = event => { editDraft.evidence = event.target.value; };
      root.querySelector('form').onsubmit = event => {
        event.preventDefault();
        editDraft.event = root.querySelector('#event-description').value;
        editDraft.when = root.querySelector('#event-time').value;
        editDraft.evidence = root.querySelector('#event-evidence').value;
        if (!editDraft.event.trim()) { error = 'Describe what happened before applying your changes.'; draw(); root.querySelector('textarea').focus(); return; }
        draft.interpretation = { ...editDraft, event: editDraft.event.trim(), when: editDraft.when.trim() || 'Not specified', edited: true };
        draft.editDraft = null;
        state = 'ready'; error = ''; draw(); root.querySelector('h2').focus();
      };
      root.querySelector('#cancel-edit').onclick = () => { draft.editDraft = null; state = draft.interpretation ? 'ready' : 'idle'; error = ''; draw(); };
      return;
    }
    if (state === 'ready') {
      root.innerHTML = `<div class="capture-result">
        <h2 tabindex="-1">${result.status === 'ready' ? result.manual ? 'Review your update' : 'Here’s what I understood' : 'A little more detail'}</h2>
        ${result.status === 'ready' ? `<dl>${[[clarified ? 'Original observation' : 'What happened', result.event], [timingClarified ? 'Clarified timing' : 'When', result.when], ['Evidence', result.evidence]].map(([label, value]) => `<dt>${label}</dt><dd>${escape(value)}</dd>`).join('')}</dl>` : `<p>${escape(result.question || result.message)}</p>`}
        ${draft.clarifications?.length ? `<details><summary>Your clarification</summary>${draft.clarifications.map(item => `<p>${escape(item.question)}</p><p class="original-update">${escape(item.answer)}</p>`).join('')}</details>` : ''}
        ${result.edited ? '<p class="hint">Edited by you.</p>' : ''}
        <p class="hint">Nothing has been saved.</p>
        <details><summary>Your original update</summary><p class="original-update">${escape(draft.originalText || draft.text)}</p></details>
        ${result.status === 'ready' ? '<button class="primary" id="edit" type="button">Edit details</button>' : result.status === 'clarification' ? `<form id="clarify" novalidate><label for="clarification-answer">Your answer</label><textarea id="clarification-answer" rows="2" maxlength="1000">${escape(draft.clarificationAnswer || '')}</textarea>${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}<button class="primary" type="submit">Update interpretation</button></form>` : ''}
        <button class="secondary" id="revise" type="button">Return to capture</button>
      </div>`;
      root.querySelector('#edit')?.addEventListener('click', () => { editDraft = draft.editDraft = { ...result }; state = 'editing'; error = ''; draw(); root.querySelector('textarea').focus(); });
      root.querySelector('#clarification-answer')?.addEventListener('input', event => { draft.clarificationAnswer = event.target.value; });
      root.querySelector('#clarify')?.addEventListener('submit', event => {
        event.preventDefault();
        const answer = root.querySelector('textarea').value.trim();
        if (!answer) { error = 'Answer the question before continuing.'; draw(); root.querySelector('textarea').focus(); return; }
        draft.originalText ||= draft.text;
        (draft.clarifications ||= []).push({ question: result.question, answer });
        draft.text += `\nClarification (${result.question}): ${answer}`;
        draft.clarificationAnswer = '';
        draft.interpretation = null; error = ''; interpret();
      });
      root.querySelector('#revise').onclick = () => { draft.interpretation = null; state = 'idle'; draw(); };
      return;
    }
    const statuses = { permission: 'Waiting for microphone permission…', recording: 'Listening…', processing: 'Processing your recording…', transcribing: 'Transcribing…', submitting: 'Submitting your update…', understanding: 'Understanding what you told me…' };
    root.innerHTML = `<div class="capture-actions">
      <p class="capture-status" role="status">${statuses[state] || 'Speak naturally, or type what happened.'}</p>
      ${recording ? '<p id="recording-time" class="hint">0 / 30 seconds</p>' : '<p class="hint">Voice updates can be up to 30 seconds.</p>'}
      <button class="primary" id="voice" type="button" ${busy || permission ? 'disabled' : ''}>${recording ? 'Stop recording' : 'Tell me'}</button>
      ${recording || permission ? '<button class="secondary" id="switch-text" type="button">Switch to text</button>' : ''}
      ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
      ${error && retryStep ? '<button class="secondary" id="retry" type="button">Try again</button>' : ''}
      ${error && retryStep === 'interpret' ? '<button class="secondary" id="manual-edit" type="button">Edit manually</button>' : ''}
      ${state === 'understanding' && draft.source === 'voice' ? `<p class="hint">Your transcript</p><p class="original-update">${escape(draft.text)}</p>` : ''}
      <form id="capture-text-form" novalidate>
        <label for="health-update">Or type your update</label>
        <textarea id="health-update" rows="4" maxlength="5000" ${busy || recording || permission ? 'disabled' : ''} aria-describedby="capture-draft-note">${escape(draft.text)}</textarea>
        <button class="secondary" type="submit" ${busy || recording || permission ? 'disabled' : ''}>Continue with text</button>
      </form>
      <p id="capture-draft-note" class="hint">Your update stays in this open page. Refreshing clears it. Nothing is saved yet.</p>
    </div>`;
    root.querySelector('#voice').onclick = () => {
      if (recording) {
        if (performance.now() - startedAt >= 30_000) { cancelRecording(); fail(new Error('Recording stopped at the 30-second limit. Please record a shorter update; this recording was not sent.')); }
        else { state = 'processing'; recorder.stop(); releaseMic(); draw(); }
      } else startRecording();
    };
    root.querySelector('#switch-text')?.addEventListener('click', () => { cancelRecording(); state = 'idle'; error = ''; draw(); root.querySelector('textarea').focus(); });
    root.querySelector('textarea').oninput = (event) => { draft.text = event.target.value; retryStep = ''; };
    root.querySelector('form').onsubmit = submitText;
    root.querySelector('#retry')?.addEventListener('click', () => {
      error = '';
      if (retryStep === 'transcribe') transcribe();
      else if (retryStep === 'interpret') interpret();
      else submitText({ preventDefault() {} });
    });
    root.querySelector('#manual-edit')?.addEventListener('click', () => {
      editDraft = draft.editDraft = { status: 'ready', event: draft.text, when: 'Not specified', evidence: 'Not specified', question: '', message: '', edited: true, manual: true };
      state = 'editing'; error = ''; draw(); root.querySelector('textarea').focus();
    });
  }

  draw();
  const dispose = () => { disposed = true; cancelRecording(); requestController?.abort(); window.removeEventListener('pagehide', dispose); };
  window.addEventListener('pagehide', dispose);
  return dispose;
}
