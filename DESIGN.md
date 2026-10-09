---
name: CareNama
description: Warm, grounded notes for someone you care for.
colors:
  paper: "#FFF9F5"
  ink: "#352A2B"
  terracotta: "#A2574F"
  terracotta-hover: "#874840"
  terracotta-active: "#743C35"
  plum: "#993A8B"
  orange: "#E68057"
  support-surface: "#F4DBD0"
  rose-surface: "#F3DCE4"
  soft-surface: "#F3E7DE"
  surface: "#FFFFFF"
  secondary-text: "#6F5B5B"
  field-border: "#B6A298"
  divider: "#EADAD0"
  icon-warm: "#F6E7DC"
  icon-orange: "#F9E0C9"
  icon-plum: "#743968"
  error: "#B54747"
typography:
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  metadata:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
rounded:
  field: "12px"
  action: "14px"
  dialog: "16px"
  circle: "50%"
spacing:
  compact: "8px"
  control: "12px"
  surface: "16px"
  section: "24px"
  generous: "32px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.surface}"
    rounded: "{rounded.action}"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-hover}"
  button-primary-active:
    backgroundColor: "{colors.terracotta-active}"
  navigation-icon:
    backgroundColor: "{colors.soft-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    size: "44px"
    padding: "11px"
---

# DESIGN.md

Read before building or changing any screen. If a choice isn't covered here, ask instead of guessing. Items marked **[V1.1]** belong to that version. Milestones 1-21 are live. Milestones 22-23 identity, shared navigation, Welcome and onboarding are implemented locally for builder review; they have not been deployed. The approved [Desert Dusk proposal](design/desert-dusk-proposal.md) remains a future screen-review reference for Milestones 24-26.

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

**Creative North Star: Desert Dusk.** Calm reassurance, warm trust and quiet intelligence: a grounded, supportive place to remember, with matte paper surfaces and restrained accents.

**Identity:** CareNama wordmark with the held-light geometric SVG: an orange circle held by two terracotta arcs. The common header carries the identity on every primary screen; logo and interface icons remain simple SVG geometry.

**Type:** self-hosted Inter 400/600, deliberately retained. Screen headline 32 px / 1.2, section and summary headings 22 px, compact person heading 18 px, body/inputs/buttons 16 px, metadata and short onboarding examples 13 px. Welcome uses a 32 px headline at all widths. Do not introduce an external font request.

**Colour**

| Role | Value |
|---|---|
| Text / background | #352A2B on #FFF9F5 |
| Surface / quiet secondary surface | #FFFFFF / #F3E7DE |
| Main action / hover / pressed | #A2574F / #874840 / #743C35 |
| Current journey step and keyboard focus | #993A8B |
| Logo light | #E68057 |
| Warm support / person context | #F4DBD0 / #F3DCE4 |
| Secondary text / field border / divider | #6F5B5B / #B6A298 / #EADAD0 |
| Error / destructive menu action | #B54747 / #993E3B |

Rose and orange are supporting identity colours, never a health assessment. The illustration anchor also includes rose #BF7587; it is an asset-direction colour, not an implemented UI token.

**Fact-type icons (decorative only, never severity)**

| Type | Icon and palette |
|---|---|
| Symptom, other, mixed update | Neutral note, terracotta #874840 on warm #F6E7DC |
| Measurement | Measurement icon, muted plum #743968 on rose #F3DCE4 |
| Medication change, doctor visit | Care icon, terracotta #874840 on orange-tinted #F9E0C9 |
| Daily wellbeing, appetite | Moon, muted plum #743968 on rose #F3DCE4 |

**Layout:** phone first; content column at most 480 px, shared header at most 520 px. Standard screen gutters 28 px, narrowed to 20 px at 360 px and below; retained timeline/summary overrides use 18 px below 350 px. Shared screen top padding is 16 px. Check 320, 390, 768 and 1440 px with no horizontal scroll, targets at least 44 px and visible keyboard focus.

**Surfaces and states:** controls use 12 px corners, primary buttons 14 px, the menu dialog 16 px. Tonal surfaces convey most depth; only the menu uses the structural shadow `0 12px 40px #352a2b33` with backdrop `#352a2b55`. Action colour transitions take 160 ms ease-out; respect reduced motion. Keyboard focus uses a 3 px plum outline with space around the control.

**Illustration medium:** original Indian daughter-and-father editorial caricature, softly painted 2D, mature proportions, matte texture and diffuse late-afternoon light. No photography mixed into the interface, childish proportions, medical equipment, glossy 3D or helpless patient framing. See [style anchor](design/style-anchor.md). Welcome displays `public/images/welcome-family-caricature.png` at its natural landscape ratio, with both faces and the embrace visible; its alternative text identifies it as an illustration.

**Shared navigation:** one header menu opens a native modal dialog without unmounting the current screen, so text, review, correction and sharing drafts remain in place. Signed-out users see Sign in; signed-in users see Your timeline and account actions. Support contains What can I record? and Privacy & your choices. Menu help is optional, not an extra onboarding screen. Closing returns focus to the menu button. Recording blocks departures and asks the caregiver to finish recording; draft-discard and in-progress action guards apply when actually leaving.

**Back and person context:** existing back actions become 44 px circular arrow controls while retaining their original accessible labels and destinations. The compact rose context surface shows the current person's name and relationship where the existing journey uses it; it does not add family switching. Repeated footer privacy/account controls are replaced by the shared menu.

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
- **Progress:** Setup/capture/review show Person ? Update ? Review, with the current step marked visually and through aria-current; no duplicate Step X of Y line. Existing-person updates show Update ? Review. Timing and corrections remain within Review; returning to capture restores Update and preserves text. Saved-update corrections use their existing focused editing screen.
- **Returning:** Open link → (Email → Code if expired) → Timeline → Add update / Summary
- **Before a visit:** Timeline → Summary → Review & share → Share / Copy

## 6. Screens

Every screen supports its loading, broken, empty and done states. Global AI-busy message: **"Busy right now. Try again in a few minutes."** — input is always kept.

### Welcome
- Headline: **"A place for the details you want to remember."**
- Supporting line: **"Health notes for someone you care for, in your own words."**
- Original daughter-and-father family illustration, followed by embedded **Say / Check / Keep** guidance: speak or type what happened, review and correct details, save with an email code. Button: **Start a health note** → Setup, with **Already started? Sign in** visibly available for returning caregivers.
- Three short examples below the actions: a symptom, a BP reading and sleep. They are illustrative text only; never prefill or save them. No compulsory tour or extra sign-in screen.
- Never lead with "AI", "tracking", "health records", "medical data" or "Family Health OS". Lead with the outcome: not having to remember everything alone.

### Setup
- Name and relationship (text fields) with reassurance that no medical profile is needed.
- Notice: one person per account in this version; returning-user sign-in link only when signed out. Signed-out setup explains upfront that an email code is needed to save. Signed-in setup has Back to your record and no sign-in invitation.
- Empty fields show a specific message and keep the other entry. Back keeps the draft; refresh clears it (explained on screen). Details are saved with the first update, including when already signed in.
- **Continue to your update** → Capture.
- Signed-in accounts with no person see the same Say / Check / Keep orientation before **Set up a health record**, with **Save to their record** instead of an email-code invitation. Accounts that retain a person after deleting all updates keep their existing empty timeline and **Add update** action.

### Capture
- Heading: **"What would you like to note about [Name]?"**
- Primary: **Speak an update**. Always visible: **Type instead**.
- Short hint: symptoms, readings, doctor visits, reported medicine changes, appetite/sleep/energy.
- Empty first-note capture shows the same three illustrative examples below the voice and typing choices. Examples do not become input. Existing-person updates omit these first-note examples and keep their two-step Update / Review journey.
- Recording: "Listening…", elapsed time, **Stop recording**. Then "Transcribing…". No live transcript.
- Broken: mic blocked → explain permission, offer typing. Empty/unusable → "I couldn't hear anything. Try again or type it instead." Over 30 seconds → ask for a shorter update; never truncate silently.
- Then "Understanding what you told me…" with nothing editable shown yet.

### Timing question (only when needed)
- All calendar displays and date fields use **DD/MM/YYYY**; phone number entry adds slashes. Invalid or unfinished entries stay visible with a clear message. Internal dates remain unambiguous YYYY-MM-DD.
- **Captured on** shows DD/MM/YYYY, local hours/minutes/seconds, UTC offset and the original device time-zone name. Editing occurrence timing never changes capture time.
- Explicit **today** uses the capture-local day. A known day with an approximate clock goes straight to review. Missing or conflicting day asks one question at a time, quoting the relevant words.
- Options: **Today**, **Yesterday**, **Choose a date**, **I'm not sure** — none preselected. Approximate wording can be kept explicitly.
- Shared-day checkbox: native 20 px checkbox beside **"Use the day I choose for these details"**, with the named facts stacked underneath in the same column; whole label tappable; starts unchecked. Each fact keeps its own clock time.

### Review
- Heading: **"Does this look right?"** One quiet surface listing every fact with its timing. Explicitly linked facts appear together under **Connected details**, with a known date/range and each fact's own date. Unrelated facts stay separate; missing, edited or invalid links fall back to individual facts. The display never adds a cause.
- Primary: **Yes, continue** (first update) / **Save update** (returning). Approves all facts together.
- The populated editor opens with **What happened** visible and a compact **When this happened** row showing the current timing. Tap that row to open only this detail's Event date, Clock time if known and separate **How certain is the day?** / **How certain is the clock time?** choices. Source and meaning stays collapsed. Invalid timing opens the row and preserves the typed entry; Back preserves unfinished fields and disclosure state. An approximate clock or part of the day never requires an exact hour; an uncertain day does not erase a known clock.
- Quiet **Change** link per fact opens the editor; removal lives inside the editor. Source and meaning controls are disclosed only when wanted. Changes return to review. Removing every fact returns to Capture.
- **Captured on** appears once beneath the facts, with the local timestamp and original zone. **Record details** starts collapsed: labels, evidence, presence/absence/uncertainty and supporting words; original input and clarifications open separately within it. Do not repeat the main fact description/date inside source fields.
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
- Heading with person's name. Primary: **Add update**. Secondary: **Summary**. Shared header menu: **Your timeline**, support/help, **Privacy & your choices**, **Sign out**, **Delete account and record [V1.1]**.
- Connected vertical rail, newest **Recorded** first (the date label is "Recorded" so it's never mistaken for symptom timing).
- Collapsed note: recorded date, first fact (max two lines), its timing, "+N details" when several. An explicitly connected first group shows its known occurrence date/range, distinct from Recorded; uncertain days are stated rather than counted as known. No range is inferred across unrelated facts.
- Note icon: **[V1.1]** taken from the stored labels (§3 icon table). One label → that icon (so appetite and wellbeing notes use the warm plum moon here too); several labels or a pending label → neutral note icon.
- **View update** opens all facts with their individual timing and one capture timestamp. **Record details** keeps evidence, labels and original words optional. Quiet **Change update** and **Delete update** sit together in this context, wrapping on narrow phones; deletion retains confirmation naming the person and saying it can't be undone.
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
- The common header menu links to Privacy from every journey. A dedicated reading page uses the existing calm colours and type, with clear headings and a keyboard-accessible Usage tracking switch. It explains account-wide choices after sign-in and browser choices before sign-in, failures preserve the previous choice, and reopening stays on Privacy.
- Plain-language page: what is stored (Convex), who processes it (Sarvam for AI, Resend for sign-in and account-deletion codes, Mixpanel analytics in the EU without health content), deletion, and an **analytics on/off** switch (on by default). Turning it off stops new events without changing health-record features; previously sent events are not removed by the switch. Profile deletion and shared copies are explained separately.

### Signed-in account without a person
- Headline: **Who are you caring for?** Supporting copy explains name/relationship, then update and review. Quiet Person ? Update ? Review preview; primary **Set up a health record** opens Setup. Account controls remain available.
- Signed-in review uses **Save update** and saves directly to the current account. The signed-out first-value and email-code journey remain available.

### Draft guidance and detail editing
- Signed-in Setup places name/relationship reassurance beneath the heading and No medical profile needed beneath the fields.
- Capture shows a short Unsaved draft / Refreshing clears it notice only after typing or recording starts. Review messages refer to this update or these changes, never the entire health record.
- Add a detail is titled distinctly, shows the original update as read-only context, and uses What else would you like to add? for the blank new-detail field. Change a detail retains the existing description and timing. Cancelling a new detail leaves the original facts intact.
