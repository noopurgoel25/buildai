# PRODUCT.md

**CareNama** — a calm place to leave health notes about someone you care for, so you can tell the doctor what actually happened since the last visit.

Status: V1 (milestones 1–15) is live. V1.1 completes V1 scope; items marked **[V1.1]** below belong to that version. Fact classification, stored-type Summary, concise sharing and account deletion (Milestones 16-19) are built and awaiting builder testing; Milestone 20 Privacy and tracking are implemented, with the EU project configured and a fictional event accepted by the EU API; dashboard confirmation remains pending; Milestone 21 remains pending (see PLAN.md). Later versions: ROADMAP.md. Reasons behind rules: DECISIONS.md.

---

## 1. The job

**Long-term product:** a Family Health Record — a continuously updated record for every member of a family, built from everyday health events (symptoms, observations, measurements, medicines, doctor visits, reports, diagnoses, treatment changes). It becomes more useful as history grows. Designed around people, not features: each person has one record and timeline, and every new capability enriches that record instead of creating a separate destination.

> When I need to understand the health of someone in my family, I want their history, current condition and care context in one place, so I can make better-informed decisions, communicate accurately with doctors and manage their care with less effort.

**First job (V1):** "How has Papa been since the last visit?"
A caregiver of an ageing parent captures changes as they happen, then reconstructs the story before an appointment without relying on memory.

**Job done, in their words:** "I can tell the doctor what actually happened since the last visit without relying on my memory."

## 2. Who, and what they do today

**User:** an adult child coordinating care for an ageing parent who has ongoing treatment or recovery, recurring doctor visits and changes between visits. They may live with the parent or coordinate remotely. The parent doesn't need to use the product.

**The trigger:** at the visit the doctor asks "How have they been?" Recency bias means only the last few days get mentioned; the first 2–3 weeks after the previous visit are undocumented.

**Today they hire:** their own and the patient's memory, family conversations, WhatsApp, phone notes, Excel/Sheets, paper, photos/PDFs of reports, prescriptions, email, hospital/lab portals — then reconstruct the story manually before each appointment (8–12+ actions across places). Documentation drops off when the patient seems better.

**Forces**

| Force | What it is | What CareNama does |
|---|---|---|
| Push | Information breaks down exactly when it matters: recent events crowd out older ones, small symptoms are forgotten, readings are scattered, family members remember differently | Every update gets a permanent place in the timeline |
| Pull | "I want to walk into the appointment prepared" — a reliable memory without maintaining a diary | Small notes become a clear period summary |
| Anxiety | AI will misunderstand; update lands on the wrong person; information disappears; AI draws medical conclusions; correcting takes longer than writing a note | Shows what it understood before saving; caregiver corrects; never invents or silently changes a note |
| Habit | Tell family, send a WhatsApp, make a mental note, or do nothing | Capturing is as easy as saying "Mom felt dizzy after lunch today" |

**Most important worry to remove:** "If I tell this app something important about my parent, will it record and keep it correctly?"
**Onboarding worry:** "I don't want another app with forms to fill and maintain."

**How they want to feel:** relieved nothing important is forgotten; prepared and confident at appointments; in control; less anxious and less burdened. It should feel like "someone is helping me remember", not "another health app to maintain".
**How they want to look:** to the patient — "I'm keeping track properly"; to the doctor — "I can give you a clear picture"; to family — "I know what's going on".

**Market context:** Eka Care stores reports and device data but has poor UX (ads, upgrade banners) and no dated symptom-change capture. Not the same use case.

## 3. The core loop

1. Something happens (dizziness, a high BP reading, appetite returns, a symptom disappears, unusual tiredness).
2. The caregiver says or types it naturally.
3. AI identifies each fact and when it happened; asks only if timing is missing or conflicting.
4. The caregiver sees every fact, corrects if needed, and confirms the whole update once.
5. First time only: the update shows as the start of the record, then email + code sign-in saves it.
6. More updates accumulate. No forms, no daily check-ins, no categories to choose.
7. Before a visit: choose a period → Summary → review and edit the text → share (WhatsApp/share sheet or copy).
8. After the visit, the caregiver continues the same record.

Before an appointment: **Prepare → Review → Share.** Per update: **one action — tell it what happened.**

## 4. V1 scope

**One caregiver → one person → voice/text capture → AI interpretation → review once → first value → email + code → persistent timeline → summary for a period → review, edit, share → return and continue.**

### 4.1 What V1 does

| # | Capability | Notes |
|---|---|---|
| 1 | Set up one person | Name + relationship only. One person per account in V1 (architecture supports more) |
| 2 | Capture by voice or text | No category choice. Examples: symptoms, readings, doctor visits, reported medicine changes, appetite/sleep/energy |
| 3 | AI interpretation | Splits one update into facts, with timing, evidence, presence/absence/uncertainty |
| 4 | Clarify timing | One question at a time, only when missing/vague/conflicting |
| 5 | Review once | All facts on one surface; correct or remove; one confirmation |
| 6 | First value before sign-in | Temporary; clearly not saved until sign-in |
| 7 | Email + 6-digit code | Saves automatically after verification; returning users go to their record |
| 8 | Timeline | Newest recorded first; open, change or delete a whole update |
| 9 | Fact types **[V1.1]** | Each fact classified at capture: symptom, measurement, medication change, doctor visit, daily wellbeing, appetite, other. Never chosen by the caregiver |
| 10 | Summary for a selected period | Default last 14 days, maximum 90 days **[V1.1]**; grouped by fact type; short overview of supported changes; undated details separate |
| 11 | Review & share | Editable plain text; summary limited to 1,500 characters, with full measurements and details one click deeper through "View all details" **[V1.1]**; native share or Copy text |
| 12 | Return and continue | Reopening goes straight to the timeline; expired session → email + code, no repeated setup |
| 13 | Delete account and record **[V1.1]** | Confirmed with a fresh email code; immediate and permanent |
| 14 | Privacy notice + product tracking **[V1.1]** | Plain-language notice; analytics without health content; opt-out switch |

### 4.2 Capture and observation rules

- **One capture** = one original text update or voice transcript, for one person, with one source and one exact device-local capture timestamp ("Captured on": when recording stops or text is submitted, with seconds and time zone). Retries, clarification, editing and sign-in never change it.
- A capture holds **one or more observations (facts)**. Each fact has its own supporting words, evidence, explicit presence/absence/uncertainty, and occurrence timing.
- **Fact type [V1.1]:** `symptom | measurement | medication change | doctor visit | daily wellbeing | appetite | other`. Symptoms also store a standard name (e.g. "chakkar aana" → dizziness); measurements store type, value and unit. Shown only in Record details; corrected through Change.
- **Explicit negatives are data** ("no dizziness today"). Silence or "no update" never becomes "no symptoms". Absence of a report is not evidence of absence.
- **Timing belongs to each fact.** Missing, vague or conflicting timing → ask. The caregiver may keep approximate timing or choose "I'm not sure". A shared date applies to several facts only when the caregiver ticks the named facts. Relative dates ("yesterday") resolve against the original capture date and time zone, never the save date. "Morning" never implies a clock time.
- **Reported care context:** medicine starts/stops/dose changes, doctor visits and appetite/sleep/energy changes are recorded as reported. Keep who said it ("Doctor said…") and supplied names, old/new doses, units and frequency. Missing details stay missing. A dose is not a measured vital. Never advice, prescription management or a schedule.
- **Review:** the caregiver confirms the whole update once; may correct or remove any fact; an empty update can never be saved. Original input, AI interpretation, clarifications and corrections are always kept.
- **Saved corrections:** Change reuses whole-update review; original input, source, AI interpretation, first-saved snapshot and capture timestamp are preserved; occurrence timing stays editable. **Delete** removes the whole capture (including preserved snapshots) but keeps the person and timeline.
- All existing records are live data, including records entered during testing. Keep them readable; never automatically split or rewrite their health facts. V1.1 classification adds metadata only, preserving original wording, evidence, occurrence timing, capture timestamps, corrections and saved snapshots. Uncertain classification remains `other` and is correctable by the caregiver.

### 4.3 Sign-in and identity

- No sign-in before first value. No anonymous permanent health record.
- Email + 6-digit numeric code only (no password, no phone number). Login emails contain no health information.
- One person per account. If a pre-sign-in update conflicts with an existing record: when name and relationship both match (ignoring case/extra spaces), ask "Is this update for [Name]?" and append only after explicit yes. Names alone never establish identity. A mismatch explains the one-person limit and leaves the update unsaved.
- Returning: authenticated → straight to the timeline; expired → email + code → timeline. Sign-out → welcome.

### 4.4 Summary rules

- Covers saved facts whose **occurrence dates** fall in the chosen inclusive period (default last 14 days, max 90 days **[V1.1]**). Facts captured in the period with unknown/uncertain dates appear separately.
- **[V1.1]** The concise summary is limited to 1,500 characters. **View all details** opens the complete detail view in one click, including all measurements and recorded facts, grouped by type. Every fact keeps its exact saved wording, date and a link to its source (evidence, absence/uncertainty, correction marking, capture timestamp).
- **Overview ("What the updates tell us"):** only supported connections across **multiple dated notes** — e.g. a symptom mentioned on several days, or explicit reported better/worse across dates. Counts are **recorded days, never episodes**. A later explicit absence applies only to that dated note, never to gaps. An isolated better/worse note stays in its category. Otherwise show neutral "add more updates" wording. **[V1.1]** candidates are computed in code for any symptom; one short AI call phrases them; template wording if the call fails.
- Never: an overall better/worse verdict, a clinical interpretation of readings, diagnosis, advice, or an inferred last-visit date.
- 1–2 source updates → say the picture is limited. None → honest empty state.
- Summaries are prepared on demand, never stored as health events; any change to source notes requires preparing again.

### 4.5 Sharing rules

- Review & share opens an editable plain-text draft. Edits never change saved notes.
- **[V1.1]** The editable concise sharing summary is limited to 1,500 characters. Give a grounded overview and explicitly indicate that further details are available; never cut off a fact mid-sentence or drop details silently. All measurements and complete recorded details remain available one click deeper through **View all details**. Opening details does not automatically append them to the concise draft or change saved notes.
- Share uses the device share menu; Copy text is the fallback; manual selection if copying is blocked. No public links, saved shares or automatic sending. Blank drafts can't be shared.

### 4.6 What the product and AI must never do

- Diagnose, recommend treatment or medication changes, or present a summary as a clinical verdict.
- Invent or silently infer medically significant facts, or present an inference as measured/reported/observed.
- Guess the person or a materially ambiguous date.
- Treat "no update" as "no symptoms".
- Act as a general chatbot or answer off-topic questions.
- Require a form, a category choice, daily check-ins, streaks or scores.
- Describe an unsigned-in update as saved or as surviving a refresh.
- Use colour to show health as good or bad.

### 4.7 What we don't ask

Never on day one: age, gender, blood group, history, diagnoses, allergies, medicine list, doctor/hospital details, ABHA, address, insurance, wearables, contacts, notifications, goals, family tree, photo, app tour.
Asking later (last visit, condition context, more people, doctor details) is planned in ROADMAP.md.

### 4.8 Not in V1

See ROADMAP.md (versions V2–V5, and "Not planned").

## 5. How we'll know it worked

Behaviour, not praise ("I like it" is weak validation). Measured through product tracking (ARCHITECTURE.md §8):

1. Captures several real updates without being prompted.
2. Returns to the same timeline later.
3. Uses the timeline to recall earlier events.
4. Prepares a summary before an appointment.
5. Edits the summary rather than rewriting it.
6. Shares it with a doctor or family member.
7. Continues recording after the appointment.

**Strongest signal:** a second doctor-visit cycle without reminders or incentives (approximated by a second summary prepared 3+ weeks after the first).

## 6. Riskiest guesses

1. Caregivers lose enough information between visits that they'll tell an AI when something changes — if it's easier than their workaround.
2. A doctor-ready summary is valuable enough to bring them back before future appointments.

**No-code check (still to run):** 4–5 caregivers send natural updates for a week (WhatsApp as research channel only). Produce a manual "since your last visit" summary and ask them to answer "How has the patient been since the last visit?" Measure: updates sent, continuation after day 1, corrections, forgotten details surfaced, willingness to use/share before a real appointment, continuation afterwards.
**Strong validation:** unprompted repeat updates; "it caught things I'd have forgotten"; preference over manual reconstruction; wanting it for the next appointment.
