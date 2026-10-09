# DECISIONS.md

Why things are the way they are. Newest first. Each entry: what was decided, why, and what it replaced. Full original wording is in `archive/2026-10-08/`.

---

### 2026-10-09 - Privacy choices and limited EU product tracking
Milestone 20 adds Privacy before sign-in and in the Account menu, plus an account-wide usage switch. Convex accepts a fixed event/property list and sends to the EU Mixpanel API without a browser SDK, typed content, names, email, readings or location. Saves and changes are counted only after successful server writes and duplicate retries do not count again. An explicit browser opt-out carries into the account once; later visits respect account choices made on other devices. The older live frontend cannot activate account tracking before Privacy is available to that account.
*Why:* learn whether capture and Summary are useful without exposing health information or weakening opt-out. Analytics failures do not interrupt health flows. Fresh-code account deletion removes analytics identities and leaves only a random-ID cleanup job for retrying EU profile deletion; the same project token suffices, so no extra deletion credential is needed. Privacy distinguishes profile removal from historical usage events and copies shared elsewhere. The configured EU API accepted a fictional landing event, and the Convex tracking action completed without emails or health-record writes; the builder confirmed that event in the EU project Events view.

### 2026-10-09 - Account deletion uses a separate fresh code and blocks new writes
Milestone 19 adds Account > Delete account and record, with a permanent-deletion explanation, cancellation before verification and a fresh six-digit email code. The server sends only to the signed-in account email, stores a salted code hash, expires it after 15 minutes and preserves the five-attempt hourly limit across resends. A verified challenge is consumed and locks the account immediately; bounded indexed cleanup removes all owned health and sign-in rows. Closing the page cannot cancel verified deletion, and reopening can resume it. Completion clears device credentials and the returning hint; a later sign-in starts fresh.
*Why:* deleting notes alone did not give the caregiver control over the whole account. Separate code verification prevents reusing a sign-in challenge. Blocking reads/writes during cleanup and checking that the user still exists prevent another tab or an old credential from recreating records. Small batches avoid a history-size cutoff; other accounts and shared AI limits are preserved. Mixpanel cleanup joins this path in Milestone 20 before analytics profiles exist.

### 2026-10-09 - Concise Summary with complete details one click deeper
Milestone 18 limits generated and edited sharing text to 1,500 characters. Summary uses the same bounded, supported overview wording. Complete recorded facts and readings move into View all details, grouped with the existing calm icons and source information. Opening details from sharing keeps the edited draft unchanged; sharing sends only that draft. All selected unknown-timing facts are accessible, replacing the previous 20-detail display cutoff.
*Why:* a caregiver needs a readable overview before looking at individual notes. Whole supported statements fit the concise text without cutting a fact mid-sentence, and an explicit count and View all details notice disclose the complete record. Saved facts remain unchanged. This implements the earlier concise-summary decision and replaces the 40,000-character sharing limit.

### 2026-10-08 - Summary uses stored facts and stays available when AI is busy
Milestone 17 groups all dated facts using saved types, separates appetite and doctor/medicine categories, and replaces the 40-fact limit with an inclusive 90-day period. Older timeline pages do not impose an additional cutoff. Overview candidates use any stored symptom name, count recorded days rather than episodes, and connect only supported dated notes. One short Sarvam call chooses among source-checked wording alternatives; on failure or invalid wording, a template preserves the same candidates and source links.
*Why:* normal six-week histories exceed 40 facts. AI should add wording, not decide which facts exist or prevent access to them. Exact wording checks reject invented clinical claims. Complete-period fingerprints catch changes even to notes outside the first 20 undated details, and prevent stale sharing. The 1,500-character concise summary remains Milestone 18.

### 2026-10-08 - Preserve live data and keep summaries concise
All existing records are live data, including records entered during testing. Milestone 16 adds classification metadata only, preserving facts, timing, corrections and first-saved snapshots. Labelling batches facts from one capture into one call and uses the shared allowance, bounded retries and checks against changed words.
*Why:* testing did not make these records disposable; labels must never rewrite health history. This supersedes the earlier test-data migration wording.
Summary and editable sharing text have a hard maximum of 1,500 characters. Full measurements and recorded details belong one click deeper in View all details; opening them does not expand the sharing draft.
*Why:* the product owner confirmed a concise summary with complete details still accessible. This supersedes the approximate target and Include all details sharing switch; implementation remains Milestone 18.

### 2026-10-08 · Docs restructured
Current-state files (PRODUCT, DESIGN, ARCHITECTURE, PLAN, PROGRESS, ROADMAP) plus this log. Dated "Approved…" paragraphs are no longer appended to spec files. IDEA_SCOPE.md frozen as history. Originals archived verbatim.
*Why:* specs had become logs; older sections contradicted newer ones and agents could follow either.

### 2026-10-08 · Labels follow the words; no label control (Milestone 16 UX)
Labels (fact types) are derived from the fact's words and shown only in Record details as "Recorded as…". The caregiver fixes a wrong label by correcting the words in Change; edited and manually entered facts are relabelled on save. If labelling can't run, the update saves with a pending label that a background retry fills; pending facts show under *Other* in Summary. Timeline icons come from stored labels.
*Why:* keeps "capture before categorise" intact; mislabels should be rare and only affect which Summary row a fact appears in. *Rejected:* a "Recorded as" dropdown in Change (Option B) — revisit if real users hit wrong labels.

### 2026-10-08 · Summary covers a selected period, not "since last visit"
V1 promise changed to a caregiver-selected period (default 14 days). Visit-anchored default moved to V2.
*Why:* the product never knew the last visit date; the docs promised something not built.

### 2026-10-08 · Classify each fact at capture
Fact types `symptom | measurement | medication change | doctor visit | daily wellbeing | appetite | other`, plus standard symptom name and measurement kind/value/unit, stored at interpretation. Never chosen by the caregiver; visible in Record details; corrected via Change. Existing test data classified once with AI.
*Why:* the summary refused periods over 40 observations (a normal 4–6 week visit cycle) and only recognised 5 symptoms in overviews. Grouping in code removes both limits.
*Appetite* is its own type at the product owner's request.

### 2026-10-08 · Summary overview: computed in code, phrased by one short AI call
Max period 90 days replaces the 40-observation cap. Template wording if the AI call fails.
*Why:* deterministic candidates can't invent claims; one short call keeps wording natural (preferred over template-only).

### 2026-10-08 · Concise share text
Default ~1,500 characters (one phone screen); "Include all details" for the full text; omitted single notes are counted, never silently dropped.
*Why:* PRODUCT promised a concise brief while allowing 40,000 characters.

### 2026-10-08 · Account and record deletion in V1
Fresh email code, immediate permanent deletion, no grace period, Mixpanel profile deleted too.
*Why:* "the caregiver controls deletion" was stated but only note-level deletion existed.

### 2026-10-08 · Product tracking with Mixpanel (EU residency)
Server-side events from Convex, no health content, random IDs, no autocapture/session replay, on by default with opt-out and privacy notice. EU chosen over India residency (owner's choice; residency can't be changed after project creation).
*Why:* PRODUCT.md's success signals had nothing measuring them.

### 2026-10-06 · Timing-screen layout
Shared-day checkbox: 20 px native, beside "Use the day I choose for these details", facts stacked below, unchecked by default. No automatic timing propagation or grouping.
*Why:* checkbox inherited 56 px text-field height and separated label from details.

### 2026-10-06 · Six-digit sign-in code
Replaced eight digits. 15-minute expiry, 5 failed attempts/hour and resend limits kept. Code, input and wording changed together.

### 2026-10-06 · Return and continue (milestone 15)
Authenticated reopen → timeline, even from stale capture/first-value links. Expired → email + code without setup. Browser flag stores only `1`. Sign-out → welcome. No offline cache, no auto-save of drafts.

### 2026-10-06 · Review, edit and share inside Summary (milestones 13–14 merged)
Editable plain-text draft, native share, Copy text fallback (selection-copy fallback added for HTTP phone preview). Draft never alters notes; stale sources block sharing; no extra AI call, public link or stored share.

### 2026-10-06 · One Summary instead of a separate doctor brief
Milestone 12 built a separate "For a doctor visit" brief; then merged into Summary (one entry, one result). Brief API and sections kept underneath; reported changes stay in categories; discussion notes in a disclosure. Separate views reconsidered after V1 (ROADMAP V2).
*Why:* two near-identical destinations made the flow less cohesive in testing.

### 2026-10-06 · Isolated changes are not an overview
A single reported better/worse note stays in its category; overview needs connections across multiple dated notes. Dates collapse into one compact row.
*Why:* a lone change was wrongly presented as a period overview.

### 2026-10-06 · Summary overview rules (milestone 11)
Source-linked overview of explicit changes and repeated symptom days; days not episodes; no verdicts or inferred visit dates; neutral fallback. Candidate list limited to five symptoms — **superseded 2026-10-08** by capture-time classification.

### 2026-10-06 · Summary grouping repair
Sarvam returned incomplete grouping JSON; switched to compact category-per-source replies within 500 tokens. **Superseded 2026-10-08** (grouping moves to code).

### 2026-10-06 · Compact timeline and decorative icons
Vertical rail; sage note, lavender measurement, sand care icons (blue moon added in Summary for daily wellbeing); one-tap open; Change inside; Delete separated.

### 2026-10-06 · Summary for a period (milestone 10)
Occurrence-date period, undated details separate, source disclosures, sparse/empty/oversized states, invalidation on source change. Transcription joined the shared 100-call allowance.

### 2026-10-06 · Same-person sign-in recovery
Pre-sign-in update for an existing record appends only after name + relationship match and explicit confirmation. Found when duplicate setup blocked a Dad/Father update.

### 2026-10-06 · One person per account, explained
Setup explains the limit; conflict screen offers Open existing timeline / Back to your update; no futile retry.

### 2026-10-06 · Care context (milestone 9)
Reported medicine starts/stops/dose changes, doctor visits and appetite/sleep/energy changes through the same capture. Speaker and supplied details kept; no advice or medicine management.

### 2026-10-06 · Saved corrections and deletion (milestone 8)
Whole-update correction preserving originals; whole-capture deletion; owner + version checks; duplicate-safe.

### 2026-10-06 · Timeline includes Add update (milestone 7)
Notes ordered by recorded time, labelled "Recorded"; captures stay together.

### 2026-10-06 · CareNama redesign
Flow became tell → clarify only if needed → review once → save. Wordmark and folded-note identity; "Speak an update" / "Type instead"; "Does this look right?" / "Yes, continue"; "Your update is ready." Sign-in saves automatically.
**Superseded:** "Tell me / Type it"; "Here's what I understood" with Save/Edit; Milestone 4 "Edit details" form asking what happened, when and *how the caregiver knows*; Milestone 5 "Confirm update", "[Name]'s health story starts here", "Not saved for next time"; welcome headline "Remember what happens between doctor visits." and supporting line "Tell us what happened to someone you care for. We'll remember it for the next appointment." (now "A place for the details you want to remember." / "Health notes for someone you care for, in your own words.").

### 2026-10-06 · Capture and observation model
One capture → many observations, each with its own timing, evidence and presence/absence/uncertainty; fixed device-local capture timestamp; explicit negatives kept; whole-update confirmation. Grouping of linked observations parked (ROADMAP V2).
*Why:* single-event model lost multi-fact updates and negatives.

### 2026-10-06 · Secure-random IDs on HTTP preview
`crypto.randomUUID` is unavailable on insecure LAN addresses; helper falls back to `getRandomValues`.

### 2026-10-06 · Resend for login codes only; own sending domain
Resend testing sender only reached the account owner; verified `carenama.digitalsideup.in`. A CareNama-owned domain is planned (ROADMAP V2).

### 2026-10-05 · Temporary drafts before sign-in
Patient identity and updates live only in the open page until email + code; refresh clears them (explained on screen). No anonymous persistent health records.

### 2026-10 · Sarvam as the only AI provider
Saaras for speech, `sarvam-105b` for language; existing credits; no OpenAI. Later `saaras:v3` replaced the deprecated Saarika.

### 2026-10 · Deferred authentication
Users reach first value before sign-in; email + code only (no password, no phone).

### Superseded rules (for reference)
- Four evidence categories including "document-derived" — not possible until documents exist (ROADMAP V4).
- "Which person is this about?" clarification — not needed with one person per account.
- Example "Dizziness recorded three times… two episodes after lunch" — counts are recorded days, not episodes.
- Example "BP has decreased overall" — no measurement-based verdicts.
- Timeline example ordered by event date — timeline is ordered by recorded date.

### 2026-10-09 ? Contextual setup and update progress
Signed-in empty accounts receive a person-first introduction and no repeated sign-in invitation. Setup, capture and review share a three-step progress indicator; existing-person updates use two steps. Signed-in review saves directly, while signed-out visitors retain first value followed by email-code saving, explained upfront. Back navigation preserves in-page drafts.
*Why:* after deletion and fresh sign-in, unconditional first-time sign-in messaging sent caregivers back to the empty timeline and obscured who the next update was for. The builder approved screen mockups before implementation.

### 2026-10-09 ? Less repetitive guidance and contextual detail entry
Remove the duplicate visible step count, move setup reassurance beside the heading, shorten draft guidance and show it after input starts, and scope unsaved messages to the current update or correction. New-detail editing shows the original capture without prefilling a duplicate fact, while existing-detail editing remains populated.
*Why:* builder phone testing found wasted space, ambiguous messages about previously saved records, and a blank Add form incorrectly presented as Change.
