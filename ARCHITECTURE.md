# ARCHITECTURE.md

Technical source of truth. Future work is listed in ROADMAP.md; implementation and release state are in PLAN.md.

## 1. Stack

| Part | Choice | Role |
|---|---|---|
| App | Mobile-first React (Vite) web app | Served by Convex static hosting (root exact routes + `registerStaticRoutes` fallback so auth discovery works; capture APIs under `/api`) |
| Backend | Convex | Database, queries/mutations/actions, HTTP routes, secrets, limits, hosting |
| Auth | Convex Auth, email + 6-digit code | Sessions and verification |
| Login email | Resend | Delivers sign-in and fresh account-deletion codes. Sender: `Carenama <login@carenama.digitalsideup.in>` (verified domain) |
| Speech-to-text | Sarvam Saaras (`saaras:v3`, transcribe mode) | Real-time REST, max 30 s audio |
| Language model | Sarvam `sarvam-105b` | Interpretation, summary overview wording |
| Product analytics **[V1.1]** | Mixpanel, **EU data residency** project | Behaviour events only, no health content |

No OpenAI dependency or fallback. Sarvam uses existing credits.

## 2. Data model

`Account → Family → Person → HealthRecord → Timeline → Capture → Observation`

- **Account** — Convex Auth user (email). Owns one Family in V1.
- **Family / Person / HealthRecord / Timeline** — one person per account in V1; tables already allow more.
- **Capture** — one original update: original text or transcript, source (voice/text), exact capture timestamp with seconds + device time zone, AI interpretation, clarification Q&A, first-saved snapshot, version (for conflict checks), confirmation ID (for duplicate-safe retries).
- **Observation** — supporting words, evidence/speaker, presence (`present | absent | uncertain`), occurrence timing (exact, date, approximate wording or unknown), user-corrected flag.
  - **[V1.2]** optional `timing.datePrecision` and `timing.timePrecision`: `exact | approximate | unknown`, independent of the legacy combined `precision`. Missing fields derive their display from legacy timing; populated records require no backfill. Dates store YYYY-MM-DD and display/accept DD/MM/YYYY.
  - **[V1.1]** `type: symptom | measurement | medication_change | doctor_visit | daily_wellbeing | appetite | other | pending` (`pending` only while labelling is retried)
  - **[V1.1]** `symptomName` (standardised, symptoms only); `measurement { kind, value, unit }` (measurements only)
- **[V1.2] Capture interpretation** — optional `interpretationVersion` (`capture-context-v2`) and `relatedGroups [{observationIds, supportingWords}]` in the reviewed capture and preserved AI snapshot. Groups use existing IDs and an exact contiguous original quote, require an explicit connection, and cannot overlap or include edited/missing facts. Invalid provider grouping falls back to no groups; invalid confirmed grouping is rejected in Convex. Corrections cannot change the original interpretation version or snapshot.
- **Usage counters** — rolling AI call counts (§6).
- **Login limits** — attempts and resends (§5).

Every read and write is checked against the signed-in account's ownership of the Person, in Convex.

## 3. Capture pipeline

1. **Record** (≤30 s) or type. Capture timestamp + time zone fixed on stop/submit.
2. **Transcribe** (voice) — Convex action → Saaras. Empty/unusable → no capture.
3. **Interpret** — Convex action → `sarvam-105b`, `reasoning_effort: null`, `max_tokens: 500`, structured JSON validated server-side before display. Prompt includes only the update text plus the minimal context needed (person name/relationship, capture date/time zone). Preserves speaker ("Doctor said" is not another patient), doses are not vitals, uncertainty kept. **[V1.2]** Versioned capture/classification prompts distinguish ongoing symptoms from explicit denial and uncertainty, and classify heartburn in the reported context without diagnosis. Existing labels and records are not automatically rewritten. **[V1.1]** also returns type, symptom name, measurement kind/value/unit — validated against the allowed lists; invalid → `other`, never guessed.
4. **Clarify timing** — resolve explicit today/yesterday against the original capture-local day. Day and clock certainty are independent; approximate clock wording does not make a known day unresolved. Context checks stay within the fact's source clause/sentence and retain qualifiers omitted by a model excerpt. Ask only unresolved day, one question at a time; answers stored with the capture.
5. **Review** — client-side draft; IDs from a secure-random helper (`crypto.randomUUID` with `getRandomValues` fallback for HTTP previews).
6. **Save** — before sign-in the draft lives only in the open page. After verification: atomic, owner-checked create of Family/Person/Record/Timeline/Capture/Observations, duplicate-safe by confirmation ID. Returning users append the same way.
7. **[V1.1] Labelling outside the first interpretation** — facts entered manually or whose words changed in Change are labelled on save with one AI call per update (edited/new facts only; unchanged facts keep their label). If the shared limit is reached or the call fails: save anyway with `type: pending`; a scheduled Convex retry fills it within the allowance (one initial attempt, then retries after 5 minutes, 30 minutes and 1 hour; after the final failure use `other`). Results apply only to still-pending facts with the same ID and words; deleted records stay deleted. Metadata changes do not alter the health-record revision or saved snapshots. Pending facts render as *Other* in Summary and with the neutral icon on the timeline. No caregiver-facing label control.
8. **Whole-update correction UI** - rewrite uses the existing interpretation action with name/relationship and the original capture time/zone. Exact unchanged facts are reconciled one-to-one and keep IDs, dates, labels and corrections. Changed facts get new IDs and pending labels, with the immutable original text as correction provenance; unsupported live groups are removed. The original interpretation snapshot is never replaced. Timing-only edits use the existing client editor without another provider call. Differences are reviewed before the existing version-checked mutation.
9. **Correct/Delete** — owner + version check; corrections keep the original input, AI interpretation, source, first-saved snapshot and capture timestamp; delete removes the whole capture.

## 4. Summary and sharing

**Current implementation:**
1. Owner-checked, indexed timeline reads in pages of 50 records, up to 200 KB per page. Only the selected occurrence dates are retained; unknown/approximate-day facts captured in the period stay separate. A known day remains dated even when its clock is approximate. The inclusive period is at most 90 days. There is no 40-observation, 8,000-character or 20-page cutoff.
2. Group all dated facts by their stored type in code: Symptoms, Measurements, Medication changes, Doctor visits, Daily wellbeing, Appetite and Other. Pending, missing or uncertain labels remain Other; never guess from words or ask AI to group them.
3. Compute overview candidates from any stored symptom name across multiple dated captures. Prefer symptom candidates before general wellbeing/appetite; this is presentation ordering, not clinical severity. Deduplicate recorded days; explicit absence describes its dated note only. Explicit reported better/worse wording may be linked to an earlier dated note on the same topic and evidence source. An isolated change never becomes an overview.
4. At most one Sarvam call chooses cautious wording for up to two precomputed candidates from exact, source-grounded alternatives. The server checks each candidate ID and every wording choice. No candidates means no AI call. Missing key, shared allowance reached, provider failure, truncation or invalid wording returns the deterministic template and all grouped facts.
5. A SHA-256 fingerprint covers the selected period and all selected sources, including revisions, labels and all undated facts. Re-read after phrasing and before sharing: additions, removals, corrections or changed labels require preparing again. Summaries are never saved as health events.

**Sharing:** server re-checks ownership, the complete period fingerprint, source membership/revisions and references before preparing text. It accepts the same number of facts as Summary; concise summary and editable sharing text have a hard maximum of 1,500 characters, checked in the server before handoff. The server also returns a bounded concise overview for Summary. The shared deterministic presentation helper selects complete dated source quotes (at most 240 characters each), with evidence/date attribution, and saved-type category highlights. Longer notes link to their full wording without shortening a claim. One-off notes are separated from multi-date patterns. The optional `presentation` response carries the bounded highlights and narrative; the server checks their combined text against 1,500 characters, and the existing Summary endpoint preserves it. Older responses use the same helper locally; server-generated sharing fits whole attributed facts and patterns after reserving title, period, count and caution text. Sharing recomputes from the current server sources rather than trusting client highlights; the concise text states the full detail count and how to access it. Full measurements and recorded details are available one click deeper through "View all details"; opening details does not append them to the sharing draft. All selected undated facts are returned for the complete detail view. No AI call, public link or stored share.

**One-time [V1.1] migration:** all existing records are live data, including those entered during testing. Classify metadata only in batches of up to 20 captures, with one AI call per capture for its unlabelled facts, within the shared limit. Older single-fact records receive labels without being split. Preserve wording, evidence, timing, capture timestamps, corrections and first-saved snapshots. The classification version makes repeated migration calls safe.

## 5. Authentication

- Convex Auth email provider; 6-digit numeric code (leading zeros allowed); expires in 15 minutes; max 5 failed attempts per hour; resend limits; all server-side.
- Signing keys set with `npm run setup:auth` (generates in memory and sends straight to Convex; never printed).
- Auth state is "pending" until both client credentials and server confirmation settle; the UI keeps the current screen during checks and routes only on settled identity changes.
- Returning-user hint: browser storage holds only the value `1` after a saved timeline loads — never identity or health data; storage failure is tolerated and grants nothing.
- Same-person append: account-scoped name + relationship match (case/whitespace-insensitive) plus explicit confirmation, rechecked server-side at save.
- **[V1.1] Account deletion (Milestone 19):** a separate six-digit deletion code is sent only to the signed-in user email. `accountDeletions` stores a salted hash, 15-minute expiry and at most five failed attempts per rolling hour, retained across resends. It shares the login email sending allowance. Verification atomically consumes the challenge and locks the account; all record reads/writes and Summary source reads reject locked or missing users, including still-valid old credentials. Indexed internal transactions remove captures/snapshots, Family, Person, Record, Timeline, auth sessions/refresh tokens/verifiers/accounts/codes/rate limits, own email usage and the user. Shared AI usage and other accounts remain untouched. A scheduled worker continues if the page closes; interrupted work is safely resumable. Completion is returned only after all owned rows are gone, then the client clears its sign-in and returning hint. Immediate, no grace period. Account-linked analytics identities are also removed, with separate retrying EU profile cleanup as described in section 8.

## 6. Limits

- **Shared AI allowance:** max 100 AI calls per rolling hour across the app, counting transcription, interpretation, summary overview and migration calls. Checked in Convex before each call.
- On limit or provider failure: "Busy right now. Try again in a few minutes." Never save an unverified interpretation; never discard the user's input.
- Voice: 30 s per recording (Sarvam REST limit); longer recordings are refused with a request to shorten, never truncated.
- Timeline pages of 50. Summary period ≤90 days **[V1.1]**. Share text ≤1,500 characters.
- Per-account and per-anonymous-session limits: ROADMAP V2.

## 7. Privacy rules

- Send the model only what the current task needs; never unrelated family or health data.
- Resend receives only the recipient email and code.
- Mixpanel receives no health content (§8).
- Summaries and share drafts are temporary; nothing shared is stored.

## 8. Product tracking [V1.1]

- One Convex tracking function sends events to Mixpanel's **EU** ingestion endpoint. No browser SDK, no autocapture, no session replay (it would record typed health notes).
- `distinct_id` = random internal ID per account (anonymous ID before sign-in, merged on sign-in). Never email, names or IP-based location.
- Respect the account's analytics opt-out (default on, disclosed in Privacy). An explicit anonymous browser opt-out carries into the account once on sign-in; subsequent visits use the account choice, including changes made on another device. Sign-out or an expired sign-in rotates the anonymous ID.
- `analyticsAccounts` stores only the account link, random analytics ID, preference and rate window. `analyticsAnonymous` stores random browser IDs, their preference and optional account link; inactive IDs expire after 90 days. The older live frontend does not activate account tracking until the account uses the frontend with Privacy.
- The server allows only the events and literal properties below, with at most 60 events per identity per minute. It derives save counts and days since the preceding server save, and timeline count buckets, from owned records. Duplicate-safe saves, corrections and deletes emit only once. Queued delivery rechecks the current account choice and deletion status. No health payload or provider response is logged.
- Account deletion removes account-linked analytics rows and schedules EU profile deletion. A durable `analyticsCleanup` row retains only the random analytics ID, deletion-event preference and creation time; hourly retries remove it after success. An opted-out account emits no account-deleted event. Profile deletion removes the profile, not previously ingested behaviour events. Analytics outages never delay health-record deletion. The same EU project token supports tracking and profile deletion.
- **Never send:** names, emails, symptoms, readings, medicine names, note text, or anything a person could be identified from.

| Event | Properties |
|---|---|
| landing_viewed | — |
| setup_completed | — |
| capture_started | method (voice/text), is_first |
| capture_failed | reason (mic_denied / empty / busy / too_long) |
| clarification_asked | — |
| update_confirmed | fact_count, was_edited |
| signin_completed | is_returning |
| update_saved | fact_count, days_since_last_save |
| timeline_opened | note_count (0 / 1-2 / 3-10 / 11-50 / 51+) |
| update_changed / update_deleted | — |
| summary_prepared | period_days, source_count (same buckets as note_count), result (ok/empty/too_long/failed) |
| share_draft_edited | edit_size (small: up to 100 changed characters / medium: 101-500 / large: over 500) |
| summary_shared | method (share/copy), version (concise) |
| account_deleted | — |

Dashboards map to PRODUCT.md §5: activation (first save), second capture within 7 days, captures per active week, summary → share rate, edit-vs-rewrite, second summary 3+ weeks after the first.

## 9. Environment variables (Convex, dev and prod)

| Variable | Purpose |
|---|---|
| `SARVAM_API_KEY` | Transcription and language model |
| `AUTH_RESEND_KEY` | Sending sign-in and account-deletion codes |
| `AUTH_EMAIL_FROM` | Sender address |
| Auth signing keys | Set via `npm run setup:auth` |
| `MIXPANEL_TOKEN` **[V1.1]** | EU project token |

Mixpanel setup: create an EU-residency project using Simplified ID Merge. Copy its Project Token from Project settings / Access Keys directly into the Convex dashboard Settings / Environment variables as `MIXPANEL_TOKEN`; never paste it in chat or a repository file. The current public site uses `aware-starfish-233`; configure that deployment. If a separate production deployment is used later, configure its token there too. The same token handles EU profile deletion; no separate deletion credential is required. Do not enable autocapture or session replay. Live verification requires seeing fictional usage events in the EU project, checking their properties and checking that opt-out stops them.

## 10. Testing

- `npm test`: unit/server tests and browser tests with simulated auth and providers; live Sarvam tests optional and skipped by default.
- Fictional data only. Live production checks never send login emails or create permanent records.
