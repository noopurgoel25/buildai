# PLAN.md

Current version: **V1.1 — complete V1 scope.** Milestones 1–15 are live (see PROGRESS.md). Work one milestone at a time, in order; each needs scope confirmation before code and builder confirmation before publishing (AGENTS.md).

Current work: **Milestones 16-18 are built and awaiting builder testing together** on `milestone-16-fact-labels`. The compatible backend is updated; the new frontend is available in local preview and has not been published. Milestone 17 groups stored fact types, accepts up to 90 days without the previous fact or page cutoffs, and falls back to a source-linked overview when AI is unavailable. Milestone 18 limits Summary and sharing drafts to 1,500 characters, with full facts and measurements one click deeper through View all details. Milestone 19 is next.

## V1.1 milestones

| # | Milestone | Done when |
|---|---|---|
| 16 | **Fact types at capture** — interpretation returns type, symptom name, measurement kind/value/unit; validated; shown in Record details; correctable via Change; safe one-time metadata classification of existing live records, including those entered during testing | New and existing facts carry a valid type without changing original facts, timing or corrections; classification retries are safe; invalid AI output falls back to `other`; Change can correct type |
| 17 | **Summary on stored types** — grouping in code; 90-day max replaces the 40-observation cap; overview candidates computed in code for any symptom; one short AI call phrases them; template fallback | A 6-week period with 120+ facts prepares; non-listed symptoms (e.g. swelling) get overview lines; AI failure still shows a template overview |
| 18 | **Concise summary and share text** — maximum 1,500 characters; "View all details" opens full measurements and details one click deeper | Generated and edited sharing text stay within 1,500 characters; extra details are disclosed and fully accessible in one click; source facts remain unchanged |
| 19 | **Delete account and record** — fresh code, immediate permanent cascade delete | All rows for the account are gone; deleted user lands on Welcome; signing in again starts fresh |
| 20 | **Privacy notice + Mixpanel (EU) tracking** — server-side events, opt-out switch, profile deletion on account deletion | Events from §8 of ARCHITECTURE.md appear in the EU project with no health content; opt-out stops events |
| 21 | **Launch check** — builder opens the live link on a phone, logged out, on mobile data, and completes the core flow | Builder confirms; V1 ready to share |

Builder setup needed before 20: create the Mixpanel project with **EU** residency and add its token in Convex settings.

## Parked
Anything new goes into the right version in ROADMAP.md, not here.
