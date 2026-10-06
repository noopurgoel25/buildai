# DESIGN.md

### Approved CareNama flow and identity

CareNama is a calm place to leave health notes about someone you care for. Keep the warm background, deep green accent and Inter type. A visible CareNama wordmark and folded-note geometry supply a consistent identity; avoid cheerful celebration, clinical good/bad colour coding, or assumptions about how the caregiver feels.

The current flow is tell → clarify only if needed → review once → save. Welcome says “A place for the details you want to remember.” Setup asks for the person's name and relationship. Capture asks “What would you like to note about [Name]?” with a prominent “Speak an update” action and an always-visible “Type instead” choice. Recording shows its state, elapsed time and Stop recording; transcription appears only after stopping.

Missing/conflicting timing asks one specific question, quoting the relevant detail. Today, Yesterday, Choose a date and “I’m not sure” have no preselected answer; approximate wording can be retained explicitly. A shared-date checkbox names the affected facts and starts unchecked. Keep each observation's own time. Relative dates stay anchored to the original device-local capture timestamp.

Review says “Does this look right?” and shows every extracted fact with its occurrence timing in one quiet surface. One “Yes, continue” approves all displayed observations together. Quiet Change links open an editor; removal lives inside the editor. Source and meaning controls are disclosed only when wanted. Changes return to whole-update review. Removing all facts returns to capture; an empty update cannot be saved. Manual recovery uses the same flow and supports adding details from the original update.

Exact capture time/time zone, evidence, explicit presence/absence/uncertainty, supporting words, original input and clarifications remain available in Record details. Their storage is unchanged. Preserve negative statements and uncertainty; never infer clinical links. Grouping related observations into entries is parked.

After confirmation, the preview says “Your update is ready.” It explains that the update is temporary and that refreshing/closing clears it before sign-in. Save this update leads to email and code verification; successful verification saves automatically. Returning users go to their existing record. Saved state says “Saved to [Name]’s record.” Failures retain the current draft and offer retry/manual recovery without implying permanent storage.

This current layout supersedes the historical milestone-specific review/confirmation layouts below. Timeline remains a subsequent milestone.

Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

## 1\. The feeling, in labels

* **Calm reassurance** — The product should reduce caregiver anxiety, not feel like a clinical dashboard.
* **Warm trust** — Friendly, human and approachable, while still feeling credible enough for health information.
* **Quiet intelligence** — AI should make the experience easier without making the product feel like a chatbot.
* **Effortless capture** — Speaking or typing an update should feel easier than maintaining a health diary.
* **Evidence clarity** — Health information should be easy to understand, verify and distinguish from AI interpretation.

## 2\. References, one per component

**Welcome / onboarding:** Headspace  
Take: Warmth, approachable language, generous whitespace, rounded surfaces and one clear primary action.  
Ignore: Meditation/wellness imagery, content merchandising and its distinctive brand colours.

**Health data / timeline:** Withings Health Mate  
Take: Strong information hierarchy, clear health-data presentation, restrained navigation and easy scanning of historical information.  
Ignore: Device-centric metrics, health scores, achievement mechanics and the broader connected-device ecosystem.

**AI confirmation / summary:** Combine the above principles rather than copying either product.  
Take: Short, human language; clear hierarchy; visible evidence; one obvious decision at a time.  
Ignore: Chatbot-style interfaces, avatars, gamification and decorative AI effects.

The product should feel inspired by these systems, not visually imitate them.

## 3\. Type and colour

Font: **Inter**

Sizes:

* **32 px** — primary screen headline
* **22 px** — section/patient/summary heading
* **16 px** — body, input and button text
* **13 px** — metadata and supporting information

Colours:

* **Text:** #24302D on **background:** #F8F7F3
* **Surfaces:** #FFFFFF
* **Secondary surface:** #F1F0EA
* **Accent:** #2F7D72, primarily for the main action and selected states
* **Errors:** #B54747
* **Secondary text:** #68736F

Use colour sparingly. Do not use colour as the primary way to categorise health events or communicate whether a health condition is "good" or "bad."

## 4\. Screens

\### Initial V1 journey



Landing → Patient setup → Capture → AI Interpretation → Confirm → First Value → Authentication → Persistent Timeline



\### Returning-user journey



Authentication → Most Recently Used Patient / Timeline → Capture



Welcome: headline → short explanation → subtle visual → primary action. Main: Get started → Patient setup.
States: Loading — none expected. Broken — retry if content fails to load. Done — Get started advances to Patient setup.



Patient setup: name → relationship → reassurance no medical profile. Main: Continue → First Capture.
States: Loading — none expected. Broken — save failure with retry; preserve entered details. Done — patient created; move to First Capture.

Milestone 2 implementation: patient identity is a temporary draft held in the open page, not a stored patient record. Ask for their name and the caregiver's relationship in text fields. Empty entries show a specific correction message and preserve the other entered details. Continue opens the capture entry; Back preserves the draft. Refresh clears it, with this limitation explained on screen. Permanent storage follows email + OTP authentication in milestone 6; voice/text capture is milestone 3.



Capture: patient → What happened? → voice-first → text. Main: Tell me → record → stop → transcribe → AI interpretation.
States: Recording — “Listening…” while the user speaks; do not show live transcription. Transcribing — “Transcribing…” after the user stops. Broken — mic blocked: explain permission and offer text input; empty/unusable recording: “I couldn’t hear anything. Try again or type it instead.” Recording over 30 seconds: ask the user to record a shorter update; never silently truncate. Done — transcript received; move to AI interpretation.



Authentication: headline → email → email OTP → brief security reassurance. Main: Continue → persistent timeline. Authentication happens after first value in the initial V1 flow; returning users authenticate when required. 
States: Loading — verifying OTP. Broken — invalid/expired OTP or delivery failure with retry. Done — authenticated and routed to the persistent patient timeline / most recently used patient.



**V1 flow constraint:** authentication is deferred until after first value; no persistent health record is saved anonymously.

**V1 voice constraint:** voice recordings are limited to 30 seconds per capture. The product must not silently truncate longer recordings.


AI interpretation: patient → event → date/time → relevant structured info → Edit/Save. Main: Save → First value → Authentication.
States: Loading — “Understanding what you told me…” with no editable assumptions shown yet. Broken — AI cannot reliably identify patient/date/event: ask a specific question rather than guess, e.g. “Which person is this about?” / “What day did this happen?” AI failure: allow retry or edit manually. Done — interpretation shown for confirmation; Save confirms the first value; email + OTP authentication follows before the health record becomes persistent.

Milestone 4 implementation: review remains a temporary draft. Edit details opens fields for what happened, when and how the caregiver knows; Apply changes returns to review and marks the details as edited by the user. Clarification uses a specific question and answer field, with the original update and clarification available separately. AI failure offers retry or manual editing without discarding the input. Back preserves review and unfinished edits for the same patient; refreshing clears them. Explain on screen that nothing has been saved. Save, first value, authentication and the persistent timeline follow in later milestones.

Milestone 5 implementation: a ready interpretation or manually reviewed update offers Confirm update as the primary action, with Edit details as secondary. Confirmation shows “[Name]’s health story starts here.” and the first confirmed update, including timing, evidence, user edits, original input and any clarification. “Not saved for next time” explains that refreshing or closing clears it. Back to review preserves the reviewed details; editing or changing the patient clears the previous confirmation. Unresolved and rejected interpretations cannot be confirmed. No anonymous event storage or sign-in screen is added here; email + OTP and persistent storage follow in milestone 6.

Milestone 6 implementation (local, awaiting email setup and real sign-in verification): Keep this health record follows first value. Email → 8-digit code → save confirmed record. Sending/verifying states disable duplicate submits. Incorrect/expired code, delivery failure and save failure preserve the confirmed update in the open page. Retry never duplicates the first event. Returning sign-in restores the existing record rather than repeating patient setup; sign-out clears in-memory health details. The saved-record screen shows the persisted first event; the fuller timeline follows in milestone 7. Auth verification is rate limited server-side; email codes expire after 15 minutes. Resend receives the login code and recipient email only, never patient or event information.



Patient timeline: patient → Add update → existing Capture/review → save back to timeline. Keep one capture together as one note, with all its facts and their own occurrence times. Order notes by capture timestamp, newest recorded first, and label the date as Recorded so it is never mistaken for symptom timing. Exact capture time, source, original input and corrections stay in Record details. Load older updates in bounded pages; failure loading older notes preserves those already on screen. No summary controls or historical edit/delete actions in milestone 7.
States: Loading — timeline skeleton while events load. Broken — “We couldn’t load the timeline. Try again.” Empty — explain that no health events have been persisted yet, with Add update as the primary action. Done — saved notes displayed newest recorded first. Returning users reuse their existing patient without setup or another login when already authenticated. Whole-update review uses Save update for a returning patient; first capture still provides temporary first value before sign-in. Save failures retain the confirmed update; retries preserve the confirmation ID and never create duplicate notes.



AI summary/doctor brief: period → overall progress → changes → measurements → notable events → questions/observations → Review/Share. Main: Review \& share → Share.
States: Loading — “Preparing your health summary…” Broken — explain that the summary couldn’t be generated; retry without losing events. Empty — “There’s nothing to summarise for this period yet.” If only 1–2 events — show the available information and explicitly say the summary is based on limited updates. Done — summary ready for review; Share becomes available.

V1 should feel like one continuous journey, not a collection of feature screens.

## 5\. The first screen's words

Headline: **Remember what happens between doctor visits.**

Under it: **Tell us what happened to someone you care for. We'll remember it for the next appointment.**

Button: **Get started** → Patient setup.

Do not lead with "AI", "tracking", "health records", "medical data" or "Family Health OS." Lead with the user's outcome: **not having to remember everything alone.**

## 6\. Principles

* **One screen, one job.**
* **The health record is the product; features should enrich it, not compete with it.**
* **Capture before categorise.** Never make the user choose a medical category before speaking or typing.
* **AI shows what it understood before anything is saved.**
* **Evidence over inference.** Preserve whether information was measured, reported, observed or documented.
* **Never imply diagnosis or treatment advice in V1.**
* **Voice is the fastest path; text is always available.** V1 uses record → stop → transcribe; never imply live transcription or real-time AI understanding.
* **Do not make the user maintain the app.** No required daily check-ins, streaks or scores.
* **The timeline is more important than a dashboard.** V1 is about remembering events.
* **Use progressive disclosure.** Ask for additional medical/contextual information only when it helps the current task.
* **The caregiver controls recording, editing, deletion and sharing.**
* **Authentication protects persistent health information.** No permanent anonymous health record.
* **Keep AI embedded in the workflow rather than creating a separate chatbot destination.**
* **Keep visual density low.** Important health information should be scannable in seconds.
* **Do not use colour to create clinical "good/bad" states.**
* **Design for imperfect information.** Missing dates and uncertain observations are normal and should be represented honestly.
* **Design for the second visit.** Returning to the same patient and continuing the same health story is a core success condition.
* **Keep future Family Health OS complexity invisible in V1.**

Milestone 8 saved corrections: each timeline note offers Change update and Delete update. Change update reuses the whole-update review and detail editor; corrections remain temporary until Save changes, with Cancel changes returning to the unchanged timeline. Original input, AI interpretation, source, capture time/time zone and the initial saved details remain preserved. Remove a detail only when another remains; deleting the whole note uses a separate confirmation that names the patient and explains it cannot be undone. Failed corrections retain the draft for retry; failed deletion retains the note. Both operations require ownership and the current version on the server; a note changed elsewhere must be reopened rather than overwritten. Successful corrections keep timeline order; removing the last note retains the patient and Add update flow. No new AI call or patient setup is needed.

Milestone 9 extends the same capture screen with a short hint naming symptoms, readings, doctor visits, reported medicine changes and appetite/sleep/energy changes. Whole-update review and the timeline retain their existing layout. Reported doctor wording stays attached to its instruction in the visible fact; no medicine management controls, extra mandatory fields, medical recommendations or separate screens are added.

After first-capture sign-in conflicts with an existing record, check the entered name and relationship against the account's saved person. A match shows Is this update for [Name]?, the existing name/relationship and prepared facts, with Yes, save to this record and No, back to my update. Nothing is appended until explicit confirmation. Failed checking or saving retains the prepared update for retry; declining returns to first value without re-entry. A mismatch keeps the existing scope explanation. Capture timestamps and explicit negatives remain unchanged.
