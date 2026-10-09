# DESIGN.md

Read before building or changing any screen. If a choice isn't covered here, ask instead of guessing. Items marked **[V1.1]** belong to that version. Milestones 16-19 labels, timeline icons, stored-type Summary, concise sharing and account deletion have passed builder testing; the signed-in setup/progress fix awaits a phone recheck before publishing; Milestone 20 Privacy and tracking are implemented, with the EU project configured and the builder confirming a fictional event in its Events view; Milestone 21 remains pending.

## 1. Feeling

- **Calm reassurance** — reduce caregiver anxiety; never a clinical dashboard.
- **Warm trust** — human and approachable, credible enough for health information.
- **Quiet intelligence** — AI makes things easier without feeling like a chatbot.
- **Effortless capture** — speaking or typing is easier than keeping a diary.
- **Evidence clarity** — easy to verify, and easy to tell recorded words from AI interpretation.

Avoid cheerful celebration, clinical good/bad colour coding, and assumptions about how the caregiver feels.

## 2. References (inspiration, not imitation)

| Component | Reference | Take | Ignore |
|---|---|---|---|
| Welcome / onboarding | Headspace | Warmth, plain language, whitespace, rounded surfaces, one primary action | Wellness imagery, merchandising, brand colours |
| Timeline / health data | Withings Health Mate | Clear hierarchy, easy scanning of history, restrained navigation | Device metrics, health scores, achievements |
| Review / summary | Both principles combined | Short human language, visible evidence, one decision at a time | Chat interfaces, avatars, gamification, decorative AI effects |

## 3. Visual system

**Identity:** CareNama wordmark and folded-note geometry on every primary screen.

**Type:** Inter — 32 px screen headline · 22 px section/person/summary heading · 16 px body, inputs, buttons · 13 px metadata.

**Colour**

| Role | Value |
|---|---|
| Text / background | #24302D on #F8F7F3 |
| Surface / secondary surface | #FFFFFF / #F1F0EA |
| Accent (main action, selected states only) | #2F7D72 |
| Error | #B54747 |
| Secondary text | #68736F (avoid at 13 px on the secondary surface: below AA contrast) |

**Fact-type icons (decorative only, never severity)**

| Type | Icon |
|---|---|
| Symptom, other | Muted sage note |
| Measurement | Lavender |
| Medication change, doctor visit | Warm sand (care) |
| Daily wellbeing, appetite | Muted blue moon |
| Mixed update (timeline) | Neutral note |

**Layout:** phone first; works at 320 px with no horizontal scroll; tap targets ≥ 44 px; visible keyboard focus; low visual density.

## 4. Principles

- One screen, one job. V1 feels like one continuous journey, not feature screens.
- The record is the product; features enrich it.
- Capture before categorise: never ask for a category.
- Show what AI understood before anything is saved.
- Voice is fastest, text always available. Record → stop → transcribe; never imply live transcription.
- Timeline over dashboard. Progressive disclosure for details.
- Design for imperfect information: missing dates and uncertainty shown honestly.
- Design for the second visit: returning and continuing is a core success condition.
- The caregiver controls recording, editing, deletion and sharing.
- Keep future family complexity invisible.

## 5. Journeys

- **First use:** Welcome → Setup → Capture → (Timing question) → Review → First value → Email → Code → Timeline
- **Signed-in first record:** Empty record introduction ? Setup ? Capture ? Review ? Save update ? Timeline; no additional sign-in.
- **Progress:** Setup/capture/review show Person ? Update ? Review, with the current step and step count. Existing-person updates show Update ? Review. Timing and corrections remain within Review; returning to capture restores Update and preserves text. Saved-update corrections use their existing focused editing screen.
- **Returning:** Open link → (Email → Code if expired) → Timeline → Add update / Summary
- **Before a visit:** Timeline → Summary → Review & share → Share / Copy

## 6. Screens

Every screen supports its loading, broken, empty and done states. Global AI-busy message: **"Busy right now. Try again in a few minutes."** — input is always kept.

### Welcome
- Headline: **"A place for the details you want to remember."**
- Supporting line: **"Health notes for someone you care for, in your own words."**
- Subtle folded-note visual. Button: **Get started** → Setup.
- Never lead with "AI", "tracking", "health records", "medical data" or "Family Health OS". Lead with the outcome: not having to remember everything alone.

### Setup
- Name and relationship (text fields) with reassurance that no medical profile is needed.
- Notice: one person per account in this version; returning-user sign-in link only when signed out. Signed-out setup explains upfront that an email code is needed to save. Signed-in setup has Back to your record and no sign-in invitation.
- Empty fields show a specific message and keep the other entry. Back keeps the draft; refresh clears it (explained on screen). Details are saved with the first update, including when already signed in.
- **Continue** → Capture.

### Capture
- Heading: **"What would you like to note about [Name]?"**
- Primary: **Speak an update**. Always visible: **Type instead**.
- Short hint: symptoms, readings, doctor visits, reported medicine changes, appetite/sleep/energy.
- Recording: "Listening…", elapsed time, **Stop recording**. Then "Transcribing…". No live transcript.
- Broken: mic blocked → explain permission, offer typing. Empty/unusable → "I couldn't hear anything. Try again or type it instead." Over 30 seconds → ask for a shorter update; never truncate silently.
- Then "Understanding what you told me…" with nothing editable shown yet.

### Timing question (only when needed)
- One question at a time, quoting the relevant words.
- Options: **Today**, **Yesterday**, **Choose a date**, **I'm not sure** — none preselected. Approximate wording can be kept explicitly.
- Shared-day checkbox: native 20 px checkbox beside **"Use the day I choose for these details"**, with the named facts stacked underneath in the same column; whole label tappable; starts unchecked. Each fact keeps its own clock time.

### Review
- Heading: **"Does this look right?"** One quiet surface listing every fact with its timing.
- Primary: **Yes, continue** (first update) / **Save update** (returning). Approves all facts together.
- Quiet **Change** link per fact opens the editor; removal lives inside the editor. Source and meaning controls are disclosed only when wanted. Changes return to review. Removing every fact returns to Capture.
- **Record details** (disclosure): exact capture time and zone, evidence, presence/absence/uncertainty, supporting words, original input, clarifications.
- **[V1.1] "Recorded as" line in Record details** per fact, in plain words: e.g. *Recorded as: Symptom · dizziness*, *Recorded as: Measurement · blood pressure 142/88 mmHg*, *Recorded as: Appetite*. While a label is being worked out: *Recorded as: being sorted — it will appear here shortly.* Never shown on the main review surface; there is no control to pick or change a label.
- AI failure: retry or enter details manually (same flow, can add details from the original words). **[V1.1]** Manually entered facts are labelled automatically when saved, like any other fact. Back keeps review and unfinished edits; refresh clears them; screen says nothing is saved yet.

### First value (before sign-in)
- **"Your update is ready."** Explains it is temporary and refreshing/closing clears it.
- Primary: **Save this update** → Email.

### Email and code
- Email → 6-digit code (leading zeros allowed) → saves automatically → **"Saved to [Name]'s record."** → Timeline.
- Sending/verifying disables repeat taps. Wrong/expired code, delivery failure and save failure keep the update with retry; retry never duplicates.
- Same-person check (pre-sign-in update vs existing record, name + relationship match): **"Is this update for [Name]?"** showing existing name/relationship and the prepared facts — **Yes, save to this record** / **No, back to my update**. Failed check/save keeps the update. Mismatch: explain one person per account, offer **Open existing timeline** and **Back to your update** (no futile retry).

### Timeline
- Heading with person's name. Primary: **Add update**. Secondary: **Summary**. Account menu: **Sign out**, **Privacy**, **Delete account and record [V1.1]**.
- Connected vertical rail, newest **Recorded** first (the date label is "Recorded" so it's never mistaken for symptom timing).
- Collapsed note: recorded date, first fact (max two lines), its timing, "+N details" when several.
- Note icon: **[V1.1]** taken from the stored labels (§3 icon table). One label → that icon (so appetite and wellbeing notes show the blue moon here too); several labels or a pending label → neutral note icon.
- **View update** opens all facts, timing and evidence; original words and clarifications are optional disclosures. **Change update** inside; **Delete update** separated below, with confirmation naming the person and saying it can't be undone.
- Change: whole-update review; **Save changes** / **Cancel changes**. **[V1.1]** A wrong label is fixed by correcting the fact's words; facts whose words changed are relabelled on save. No label dropdown or extra fields. The screen looks exactly as today. A note changed elsewhere must be reopened, not overwritten. Failed save keeps the draft; failed delete keeps the note. Opened notes stay open after cancelling.
- Older notes load in pages; a failed page keeps what's shown. Loading: skeleton. Broken: "We couldn't load the timeline. Try again." Empty: explain nothing is saved yet, with Add update.

### Summary
- Heading: **"[Name]'s health summary"**. From/To (default last 14 days; max 90 days, including both dates), **Prepare summary**, **Back to timeline**. Note that undated details appear separately.
- After preparing: one compact 44 px row with the selected dates and **Change dates**; inputs disclosed on demand; no repeated date heading.
- **"What the updates tell us"**: short source-linked overview, or neutral add-more-updates wording. If AI is unavailable, the same supported overview appears in template wording; it does not block Summary. The overview stays concise; its sources are available within View all details.
- **View all details** opens a dedicated detail view in one click, with complete facts visible under their stored type. One row per stored fact type with data (Symptoms, Measurements, Medication changes, Doctor visits, Daily wellbeing, Appetite, Other), with its icon and count, expanded initially; tap to collapse. Facts retain exact words, measurements, dates and **View source**. Explicit reported changes stay inside their row. Visit discussion notes in an optional disclosure.
- Unknown-timing details are separate and fully shown within View all details, without the previous 20-detail cutoff. Preparation information stays in About this summary. Back returns to Summary or the sharing draft, keeping draft edits.
- States: Loading "Preparing your health summary…" (repeat taps disabled). Broken: couldn't prepare, retry, dates kept. Empty: "There's nothing to summarise for this period yet." 1–2 updates: say the picture is limited. Period too long: ask for a shorter period. Changing dates clears the old result; late responses can't replace a newer view.
- Primary: **Review & share**.

### Review & share
- Editable plain-text draft. **[V1.1]** Summary and editable sharing text have a hard maximum of **1,500 characters**. **View all details** opens full measurements and recorded details one click deeper; opening it does not append details to the concise sharing draft.
- **Share** (device menu) and **Copy text** (fallback; manual selection if blocked). HTTP preview has copying only.
- **Back to summary** keeps edits. Changing dates, preparing again or leaving warns before discarding edits. Blank drafts can't be shared. Errors/cancellation keep the text. If notes changed since preparing, ask to prepare again.

### Delete account and record [V1.1]
- Explains what is deleted (account, person, every note) and that it is immediate and permanent.
- Account menu opens the explanation; **Keep my account** cancels before deletion starts. **Send deletion code** sends to the signed-in account email, with no health content. A fresh six-digit code expires in 15 minutes; confirm with **Permanently delete account and record**. Failed/expired codes keep the record, and errors keep the entered code.
- Once verified, deletion cannot be cancelled. If interrupted, **Finish deleting my account** resumes cleanup. Completion clears the current device sign-in and returning-record hint, then opens Welcome with a short confirmation; signing in again starts with an empty record.

### Privacy [V1.1]
- Welcome and the timeline Account menu link to Privacy. A dedicated reading page uses the existing calm colours and type, with clear headings and a keyboard-accessible Usage tracking switch. It explains account-wide choices after sign-in and browser choices before sign-in, failures preserve the previous choice, and reopening stays on Privacy.
- Plain-language page: what is stored (Convex), who processes it (Sarvam for AI, Resend for sign-in and account-deletion codes, Mixpanel analytics in the EU without health content), deletion, and an **analytics on/off** switch (on by default). Turning it off stops new events without changing health-record features; previously sent events are not removed by the switch. Profile deletion and shared copies are explained separately.

### Signed-in account without a person
- Headline: **Who are you caring for?** Supporting copy explains name/relationship, then update and review. Quiet Person ? Update ? Review preview; primary **Set up a health record** opens Setup. Account controls remain available.
- Signed-in review uses **Save update** and saves directly to the current account. The signed-out first-value and email-code journey remain available.
