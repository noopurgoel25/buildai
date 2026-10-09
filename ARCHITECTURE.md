# ARCHITECTURE.md

Technical source of truth. Items marked **[V1.1]** belong to that version. Fact classification, stored-type Summary, concise sharing and account deletion (Milestones 16-19) are built and awaiting builder testing; later milestones remain pending. Future-proofing work is listed in ROADMAP.md.

## 1. Stack

| Part | Choice | Role |
|---|---|---|
| App | Mobile-first React (Vite) web app | Served by Convex static hosting (root exact routes + `registerStaticRoutes` fallback so auth discovery works; capture APIs under `/api`) |
| Backend | Convex | Database, queries/mutations/actions, HTTP routes, secrets, limits, hosting |
| Auth | Convex Auth, email + 6-digit code | Sessions and verification |
| Login email | Resend | Delivers sign-in codes only. Sender: `Carenama <login@carenama.digitalsideup.in>` (verified domain) |
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
  - **[V1.1]** `type: symptom | measurement | medication_change | doctor_visit | daily_wellbeing | appetite | other | pending` (`pending` only while labelling is retried)
  - **[V1.1]** `symptomName` (standardised, symptoms only); `measurement { kind, value, unit }` (measurements only)
- **Usage counters** — rolling AI call counts (§6).
- **Login limits** — attempts and resends (§5).

Every read and write is checked against the signed-in account's ownership of the Person, in Convex.

## 3. Capture pipeline

1. **Record** (≤30 s) or type. Capture timestamp + time zone fixed on stop/submit.
2. **Transcribe** (voice) — Convex action → Saaras. Empty/unusable → no capture.
3. **Interpret** — Convex action → `sarvam-105b`, `reasoning_effort: null`, `max_tokens: 500`, structured JSON validated server-side before display. Prompt includes only the update text plus the minimal context needed (person name/relationship, capture date/time zone). Preserves speaker ("Doctor said" is not another patient), doses are not vitals, uncertainty kept. **[V1.1]** also returns type, symptom name, measurement kind/value/unit — validated against the allowed lists; invalid → `other`, never guessed.
4. **Clarify timing** — one question at a time; answers stored with the capture.
5. **Review** — client-side draft; IDs from a secure-random helper (`crypto.randomUUID` with `getRandomValues` fallback for HTTP previews).
6. **Save** — before sign-in the draft lives only in the open page. After verification: atomic, owner-checked create of Family/Person/Record/Timeline/Capture/Observations, duplicate-safe by confirmation ID. Returning users append the same way.
7. **[V1.1] Labelling outside the first interpretation** — facts entered manually or whose words changed in Change are labelled on save with one AI call per update (edited/new facts only; unchanged facts keep their label). If the shared limit is reached or the call fails: save anyway with `type: pending`; a scheduled Convex retry fills it within the allowance (one initial attempt, then retries after 5 minutes, 30 minutes and 1 hour; after the final failure use `other`). Results apply only to still-pending facts with the same ID and words; deleted records stay deleted. Metadata changes do not alter the health-record revision or saved snapshots. Pending facts render as *Other* in Summary and with the neutral icon on the timeline. No caregiver-facing label control.
8. **Correct/Delete** — owner + version check; corrections keep the original input, AI interpretation, source, first-saved snapshot and capture timestamp; delete removes the whole capture.

## 4. Summary and sharing

**Current implementation (Milestones 17-18; frontend awaiting builder confirmation):**
1. Owner-checked, indexed timeline reads in pages of 50 records, up to 200 KB per page. Only the selected occurrence dates are retained; undated facts captured in the period stay separate. The inclusive period is at most 90 days. There is no 40-observation, 8,000-character or 20-page cutoff.
2. Group all dated facts by their stored type in code: Symptoms, Measurements, Medication changes, Doctor visits, Daily wellbeing, Appetite and Other. Pending, missing or uncertain labels remain Other; never guess from words or ask AI to group them.
3. Compute overview candidates from any stored symptom name across multiple dated captures. Deduplicate recorded days; explicit absence describes its dated note only. Explicit reported better/worse wording may be linked to an earlier dated note on the same topic and evidence source. An isolated change never becomes an overview.
4. At most one Sarvam call chooses cautious wording for up to two precomputed candidates from exact, source-grounded alternatives. The server checks each candidate ID and every wording choice. No candidates means no AI call. Missing key, shared allowance reached, provider failure, truncation or invalid wording returns the deterministic template and all grouped facts.
5. A SHA-256 fingerprint covers the selected period and all selected sources, including revisions, labels and all undated facts. Re-read after phrasing and before sharing: additions, removals, corrections or changed labels require preparing again. Summaries are never saved as health events.

**Sharing:** server re-checks ownership, the complete period fingerprint, source membership/revisions and references before preparing text. It accepts the same number of facts as Summary; concise summary and editable sharing text have a hard maximum of 1,500 characters, checked in the server before handoff. The server also returns a bounded concise overview for Summary. Whole supported overview statements are fitted within the budget; the concise text states the full detail count and how to access it. Full measurements and recorded details are available one click deeper through "View all details"; opening details does not append them to the sharing draft. All selected undated facts are returned for the complete detail view. No AI call, public link or stored share.

**One-time [V1.1] migration:** all existing records are live data, including those entered during testing. Classify metadata only in batches of up to 20 captures, with one AI call per capture for its unlabelled facts, within the shared limit. Older single-fact records receive labels without being split. Preserve wording, evidence, timing, capture timestamps, corrections and first-saved snapshots. The classification version makes repeated migration calls safe.

## 5. Authentication

- Convex Auth email provider; 6-digit numeric code (leading zeros allowed); expires in 15 minutes; max 5 failed attempts per hour; resend limits; all server-side.
- Signing keys set with `npm run setup:auth` (generates in memory and sends straight to Convex; never printed).
- Auth state is "pending" until both client credentials and server confirmation settle; the UI keeps the current screen during checks and routes only on settled identity changes.
- Returning-user hint: browser storage holds only the value `1` after a saved timeline loads — never identity or health data; storage failure is tolerated and grants nothing.
- Same-person append: account-scoped name + relationship match (case/whitespace-insensitive) plus explicit confirmation, rechecked server-side at save.
- **[V1.1] Account deletion (Milestone 19):** a separate six-digit deletion code is sent only to the signed-in user email. `accountDeletions` stores a salted hash, 15-minute expiry and at most five failed attempts per rolling hour, retained across resends. It shares the login email sending allowance. Verification atomically consumes the challenge and locks the account; all record reads/writes and Summary source reads reject locked or missing users, including still-valid old credentials. Indexed internal transactions remove captures/snapshots, Family, Person, Record, Timeline, auth sessions/refresh tokens/verifiers/accounts/codes/rate limits, own email usage and the user. Shared AI usage and other accounts remain untouched. A scheduled worker continues if the page closes; interrupted work is safely resumable. Completion is returned only after all owned rows are gone, then the client clears its sign-in and returning hint. Immediate, no grace period. Mixpanel profile cleanup is added with tracking in Milestone 20, before any profiles are sent.

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
- Respect the account's analytics opt-out (default on, disclosed in Privacy). Delete the Mixpanel profile on account deletion.
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
| timeline_opened | note_count bucket |
| update_changed / update_deleted | — |
| summary_prepared | period_days, source_count bucket, result (ok/empty/too_long/failed) |
| share_draft_edited | edit size bucket |
| summary_shared | method (share/copy), version (concise/full) |
| account_deleted | — |

Dashboards map to PRODUCT.md §5: activation (first save), second capture within 7 days, captures per active week, summary → share rate, edit-vs-rewrite, second summary 3+ weeks after the first.

## 9. Environment variables (Convex, dev and prod)

| Variable | Purpose |
|---|---|
| `SARVAM_API_KEY` | Transcription and language model |
| `AUTH_RESEND_KEY` | Sending login codes |
| `AUTH_EMAIL_FROM` | Sender address |
| Auth signing keys | Set via `npm run setup:auth` |
| `MIXPANEL_TOKEN` **[V1.1]** | EU project token |
| Mixpanel deletion credential **[V1.1]** | For profile deletion (name chosen at build time) |

## 10. Testing

- `npm test`: unit/server tests and browser tests with simulated auth and providers; live Sarvam tests optional and skipped by default.
- Fictional data only. Live production checks never send login emails or create permanent records.
