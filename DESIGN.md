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

Read before building or changing any screen. If a choice isn't covered here, ask instead of guessing. Items marked **[V1.1]** belong to that version. Implementation and release state are in PLAN.md. The approved [Desert Dusk proposal](design/desert-dusk-proposal.md) remains the design reference.

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

**Type:** self-hosted Inter 400/600, deliberately retained. Screen headline 32 px / 1.2, summary headings 20 px, section headings 18 px, compact person heading 16 px, body/inputs/buttons 16 px, metadata and short onboarding examples 13 px. Welcome uses a 32 px headline at all widths. Do not introduce an external font request.

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

**Layout:** phone first; content column at most 480 px, shared header at most 480 px. Standard screen gutters 24 px, narrowed to 20 px at 360 px and below. Shared screen top padding is 20 px. Check 320, 390, 768 and 1440 px with no horizontal scroll, targets at least 44 px and visible keyboard focus. Long names, emails and notes wrap within the content column; source disclosures also have a 44 px touch area.

**Surfaces and states:** controls use 12 px corners, primary buttons 14 px, the menu dialog 16 px. Tonal surfaces convey most depth; only the menu uses the structural shadow `0 12px 40px #352a2b33` with backdrop `#352a2b55`. Action colour transitions take 160 ms ease-out; respect reduced motion. Keyboard focus uses a 3 px plum outline with space around the control.

**Illustration medium:** original Indian daughter-and-father editorial caricature, softly painted 2D, mature proportions, matte texture and diffuse late-afternoon light. No photography mixed into the interface, childish proportions, medical equipment, glossy 3D or helpless patient framing. See [style anchor](design/style-anchor.md). Welcome displays `public/images/welcome-family-caricature.png` in the approved 342:225 landscape frame, with both faces and the embrace visible; its alternative text identifies it as an illustration.

**Shared navigation:** a single compact header carries the held-light logo and CareNama wordmark on every screen. Interior screens put a 44 px contextual Back arrow on the left, compact identity in the middle and a 44 px Menu control on the right. Welcome and the top-level timeline omit Back. There is no separate Back row in screen content. The menu has its own identity and one Close control, with Your CareNama, compact person context and grouped Timeline/Summary, Support and Account choices. Signed-out users see Sign in and support, without record/account controls. Opening the native dialog keeps the current screen and drafts mounted; closing restores focus. Recording blocks departures; changed drafts and busy actions retain their guards.

**Person context and progress:** a 44 px initials circle beside name and relationship replaces the oversized pink panel. Setup/capture/review use thin underlined Person / Update / Review segments, with plum for the current step and aria-current. Existing-person capture keeps Update / Review only. No numbered circles, duplicate step count or family switcher.

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
- **Signed-in first record:** Empty record introduction → Setup → Capture → Review → Save update → Timeline; no additional sign-in.
- **Progress:** Setup/capture/review show Person → Update → Review, with the current step marked visually and through aria-current; no duplicate Step X of Y line. Existing-person updates show Update → Review. Timing and corrections remain within Review; returning to capture restores Update and preserves text. Saved-update corrections use their existing focused editing screen.
- **Returning:** Open link → (Email → Code if expired) → Timeline → Add update / Summary
- **Before a visit:** Timeline → Summary → Review & share → Share / Copy

## 6. Screens

Every screen supports its loading, broken, empty and done states. Global AI-busy message: **"Busy right now. Try again in a few minutes."** — input is always kept.

### Welcome
- Headline: **"A little note. A clearer picture."** Supporting text: **"Keep track of someone you care for, one health update at a time."**
- Original family illustration, then **"A symptom, a reading or a change in their day. Say it in your own words. We'll help you organise it."**
- One **Start a health note** action and quiet **Already have a record? Sign in** line.
- Below a thin divider: **Say it / Voice or text**, **Check it / You stay in control**, **Keep it / Ready for your visit**.
- Specific symptom/reading/sleep examples belong on Capture, never on Welcome. No compulsory tour.

### Setup
- **Who are you caring for?** followed by **"Just a name and your relationship. No medical profile needed."**
- **Name** and **Relationship** remain free-text fields, with validation that preserves the other entry. No medical profile, dropdown or repeated sign-in invitation.
- Warm logo reassurance: **"A small note today can help you remember what mattered later."**
- **Continue to your update**, then **"Next: say or type what happened."**
- Show the short refresh-clears-draft notice after input starts. Back preserves the draft. Details are saved with the first confirmed note; signed-in empty accounts do not sign in again.

### Capture
- Compact person row, slim journey tracker, **"What would you like to remember?"** and **"Tell us what happened to [Name]. It doesn't need to sound medical."**
- Empty capture has three italic examples under **You could mention...**, framed by fine dividers. Examples never prefill or save.
- Tonal microphone surface: **Tap to record / Up to 30 seconds**. Then **or type a note**, with textarea already visible. Placeholder: **"What happened? When, if you remember."**
- **Review your note**, followed by **"You'll check this before saving."** Unsaved warning appears only when relevant.
- Recording has elapsed time, Stop recording and Switch to text; then processing/transcription. Never imply live transcription. Blocked mic, empty audio, 30-second limit and provider failure keep recoverable input and typing available.

### Timing question (only when needed)
- All calendar displays and date fields use **DD/MM/YYYY**; phone number entry adds slashes. Invalid or unfinished entries stay visible with a clear message. Internal dates remain unambiguous YYYY-MM-DD.
- **Captured on** shows DD/MM/YYYY, local hours/minutes/seconds, UTC offset and the original device time-zone name. Editing occurrence timing never changes capture time.
- Explicit **today** uses the capture-local day. A known day with an approximate clock goes straight to review. Missing or conflicting day asks one question at a time, quoting the relevant words.
- Options: **Today**, **Yesterday**, **Choose a date**, **I'm not sure** — none preselected. Approximate wording can be kept explicitly.
- Shared-day checkbox: native 20 px checkbox beside **"Use the day I choose for these details"**, with the named facts stacked underneath in the same column; whole label tappable; starts unchecked. Each fact keeps its own clock time.

### Review
- **"Does this sound right?"** and **"Your words, organised into one update."**
- One warm story container with saved-type icon/label, source-grounded title and all individually dated facts. Related groups require explicit source support; never invent a sequence or cause. Invalid groups leave the intact individual facts visible.
- One **Change this update** action opens the populated whole-update editor. **Add something else** uses the current reviewed words, preserving corrections rather than rebuilding from the original transcript.
- Primary **Save update** for signed-in notes; **Continue to save** with **"Sign in next to save this note."** for the first signed-out note. No saving before verification.
- One original capture timestamp with seconds and zone. Record details, classifications, evidence, polarity and original words remain disclosed on demand. No category picker.
- Back returns to capture and preserves review/edit state. An unfinished edit cannot be confirmed silently. Removing all facts returns to capture; provider failure offers retry or manual detail entry.

### First value (before sign-in)
- **"Your update is ready."** with compact person context and the same story card.
- One **Save this update** action, a short sign-in destination line and a clear refresh/close-clears-note notice. No repeated "Keep this for next time" heading.
- Original capture time and source details remain available. The note is temporary until sign-in and saving succeed.

### Email and code
- First-note code screen: **"Keep this note safe for later"**, destination email, six-digit numeric field (leading zeros allowed) and **Verify & save update**, with the named record destination.
- Returning verification uses **Verify & continue**. **Resend code / Change email** are quiet actions on one row. Warm lock reassurance: **"Only you can access this record. You choose what to share."**
- Sending/verifying prevent repeat taps. Wrong/expired code, sending failure and saving failure keep the draft; retries never duplicate.
- Same-person checks and mismatches retain explicit confirmation, one-person-per-account rules and return to the prepared note.
- A known older-backend argument mismatch in local preview explains that saving is unavailable in this preview while preserving the note; do not offer a futile retry.

### Timeline
- Compact person row; **"[Name]'s health notes"**, **"Small updates. A story you can return to."**, visible **Timeline / Summary** tabs and one **Add update** action.
- Compact flat rows grouped by Recorded day, newest recorded first, with supportive saved-type icons, a source-grounded title, occurrence date/range and chevron. Recorded dates and occurrence dates remain distinguishable. No separate Summary button or repeated timeline heading.
- Tap a row to open the update-details screen: dynamic fact count/relatedness, same story card, **Your original note**, one capture timestamp, collapsed **Source & record details**, primary **Change update** and quiet **Delete update**.
- Back restores focus to the originating row. Editing cancellation returns to the unchanged note. Deletion still needs explicit irreversible confirmation; failures retain the saved note. Older pages, empty/loading/error/retry states remain supported.
- Whole-update editing has current fact words, per-fact timing rows, collapsed More record details, Review changes and Cancel changes. Rewritten input shows differences before saving. Unchanged facts keep their IDs, dates, labels and earlier corrections; original input, AI snapshot and capture time never change. Changed words are relabelled on save; stale edits require reopening.

### Summary
- Compact person row, **"A clearer picture for your visit"**, Timeline / Summary tabs; From/To default last 14 days and maximum 90 inclusive days.
- After preparing: one compact 44 px row with the selected dates and **Change dates**; inputs disclosed on demand; no repeated date heading.
- **What stands out** shows selected dated symptom and care notes verbatim with evidence attribution, including one-off facts. Explain that one-off notes do not establish patterns.
- Supported multi-date patterns appear within What stands out, distinct from attributed one-off notes. Sources are available in full details. No unsupported health verdict.
- **In this period** uses compact tappable saved-type rows with useful topic/whole-note highlights and recorded-day counts. Readings say Full measurements inside. The entire row opens that category in one tap; no separate per-row link. Back restores focus.
- **View all details** opens a dedicated detail view in one click, with complete facts visible under their stored type. One row per stored fact type with data (Symptoms, Measurements, Medication changes, Doctor visits, Daily wellbeing, Appetite, Other), with its icon and count, expanded initially; tap to collapse. Facts retain exact words, measurements, dates and **View source**. Explicit reported changes stay inside their row. Visit discussion notes in an optional disclosure.
- Unknown-timing details are separate and fully shown within View all details, without the previous 20-detail cutoff. Preparation information stays in About this summary. Back returns to Summary or the sharing draft, keeping draft edits.
- States: Loading "Preparing your health summary…" (repeat taps disabled). Broken: couldn't prepare, retry, dates kept. Empty: "There's nothing to summarise for this period yet." 1–2 updates: say the picture is limited. Period too long: ask for a shorter period. Changing dates clears the old result; late responses can't replace a newer view.
- Primary: **Review & share summary**.

### Review & share
- Editable plain-text draft. **[V1.1]** Summary and editable sharing text have a hard maximum of **1,500 characters**. **View all details** opens full measurements and recorded details one click deeper; opening it does not append details to the concise sharing draft.
- **Share** (device menu) and **Copy text** (fallback; manual selection if blocked). HTTP preview has copying only.
- **Back to summary** keeps edits. Changing dates, preparing again or leaving warns before discarding edits. Blank drafts can't be shared. Errors/cancellation keep the text. If notes changed since preparing, ask to prepare again.

### Delete account and record [V1.1]
- Explains what is deleted (account, person, every note) and that it is immediate and permanent.
- Account menu opens the explanation; **Keep my account** cancels before deletion starts. **Send deletion code** sends to the signed-in account email, with no health content. A fresh six-digit code expires in 15 minutes; confirm with **Permanently delete account and record**. Failed/expired codes keep the record, and errors keep the entered code.
- Once verified, deletion cannot be cancelled. If interrupted, **Finish deleting my account** resumes cleanup. Completion clears the current device sign-in and returning-record hint, then opens Welcome with a short confirmation; signing in again starts with an empty record.

### Privacy [V1.1]
- The common header menu links to Privacy from every journey. A dedicated reading page uses the existing calm colours and type, with clear headings and a keyboard-accessible Usage tracking switch. On/Off uses darker terracotta #874840 for readable contrast on both switch surfaces. It explains account-wide choices after sign-in and browser choices before sign-in, failures preserve the previous choice, and reopening stays on Privacy.
- Plain-language page: what is stored (Convex), who processes it (Sarvam for AI, Resend for sign-in and account-deletion codes, Mixpanel analytics in the EU without health content), deletion, and an **analytics on/off** switch (on by default). Turning it off stops new events without changing health-record features; previously sent events are not removed by the switch. Profile deletion and shared copies are explained separately.

### Signed-in account without a person
- Headline: **Who are you caring for?** Supporting copy explains name/relationship, then update and review. Compact Say / Check / Keep guidance; primary **Set up a health record** opens Setup. Account controls remain available.
- Signed-in review uses **Save update** and saves directly to the current account. The signed-out first-value and email-code journey remain available.

### Draft guidance and detail editing
- Signed-in Setup places name/relationship reassurance beneath the heading and No medical profile needed beneath the fields.
- Capture shows a short Unsaved draft / Refreshing clears it notice only after typing or recording starts. Review messages refer to this update or these changes, never the entire health record.
- Add a detail is titled distinctly, shows the original update as read-only context, and uses What else would you like to add? for the blank new-detail field. Change a detail retains the existing description and timing. Cancelling a new detail leaves the original facts intact.
