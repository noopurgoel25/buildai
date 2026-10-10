# PLAN.md

Current version: **V1.2 - caregiver feedback improvements.** V1/V1.1 Milestones 1-21 are complete and live. Each milestone needs builder testing before publishing.

Current release: **Milestones 22-27 are live at https://aware-starfish-233.convex.site, published from `milestone-27-release-checks` (code `777423c`).** The builder confirmed the corrected combined preview and requested publishing. The matching Convex backend and approved screens are deployed together; Relationship remains a text box. The hosted fictional-note journey and responsive checks passed. Physical phone voice, saving and native sharing remain device checks; public sharing waits for the logged-out mobile-data core-flow check.

## V1.2 - caregiver feedback improvements

**Approved scope; implementation is one milestone at a time.** Keep one person per account in this release, as confirmed by the builder. Family switching remains V2. Candidate screen designs and interaction rules: [Desert Dusk proposal](design/desert-dusk-proposal.md).

Scope: Desert Dusk identity and original Indian daughter-and-father editorial caricature; clearer Welcome and embedded onboarding guidance; common menu and visual back navigation; visible person context; DD/MM/YYYY throughout; compact editing and record details; context-aware, source-grounded interpretation with related facts shown together; useful Summary category highlights and notable symptoms; unchanged 1,500-character Summary/share limits and deeper full measurements. Preserve all existing live records, including those entered during testing.

| Milestone | End-to-end outcome |
|---|---|
| 22 - Identity and shared navigation | New logo/palette, header, accessible menu/back controls and person context across existing journeys; fewer repeated account links; drafts preserved |
| 23 - Welcome and onboarding | Original Indian family caricature, clear input examples and Say / Check / Keep guidance; correct first-time, signed-in empty and returning flows, without extra sign-in or compulsory tour screens |
| 24 - Timing and context integrity | Consistent DD/MM/YYYY display/input and local capture time; today resolved automatically; separate date/time certainty; context-aware presence and classification, including heartburn; safe optional grouping with fictional regression cases |
| 25 - Compact connected records | Related observations retain individual dates inside one update; shorter populated editor and on-demand provenance; understandable review, timeline and detail screens |
| 26 - Useful Summary and sharing | Notable symptoms and category highlights visible, supported patterns distinct from one-off facts; meaningful share text, 1,500-character server limit and full details one click deeper |
| 27 - Release checks | Existing and new journeys pass simulated-provider tests and responsive/accessibility checks; caregiver phone review, then authorised deploy and live check |

Build and confirm one milestone at a time. Grouping presentation for same-capture related observations is pulled forward from V2; broader family/cross-record linking is not included. Versioned interpretation checks required for this work are pulled forward only as needed; do not expand into a general AI platform. Existing-label correction requires a concrete migration scope and recoverable backup, never silent rewriting of recorded facts.

Out of this release: multiple family members, second caregivers, languages, reminders, PDF export, a separate doctor-brief destination, clinical diagnosis/causation or automatic learning from real health notes. The rest of the roadmap remains unchanged.

## Milestone 27 release review

- Approved designs reviewed and implemented in the real app: board copy, original family illustration, logo on every screen, compact shared Back/logo/Menu header, initials person row, thin journey segments, warm story cards, flat timeline rows and separate update details, whole-update editing, compact Summary rows, menu and code verification. Relationship remains a text box. Specific examples appear only on Capture; duplicate links and headings are removed.
- Release fixes: unchanged input resumes its reviewed corrections after Back; unfinished whole edits cannot be saved silently; Cancel restores staged details; saved corrections warn before discarding through Back; stale edit recovery reloads the timeline. Current person requests exclude database IDs. Long names wrap; touch controls have 44 px targets; text contrast uses the approved darker colours. Publishing resolved the older backend's argument mismatch: read-only hosted function metadata confirms that both save functions accept the new date-certainty, grouping and interpretation-version fields. A dated-note editor failure found during the first live check was fixed by importing the existing date formatter and republishing.
- Automated proof: 90 unit/server checks pass; all 90 simulated browser scenarios verified across the suite and focused reruns (180 total). Nine optional live-provider tests remain skipped. Two checks that timed out during simultaneous work and a recording check interrupted by a preview reload passed their settled-build reruns. The fictional release journey covers 20 screens/states; the board comparison walks 11 actual app screens at 320, 390, 768 and 1440 px with no overflow, small active targets, low text contrast or browser errors. New checks cover whole-note rewrite reconciliation, Back/Cancel integrity, unknown-only Summary periods and the older-preview save mismatch.
- Build and Convex TypeScript check pass. The new dated-note regression check reproduced the editor failure, then passed with three related date/edit checks after the fix. The corrected production build passed and `npm run deploy` published it successfully. No existing-record migration was run.
- Hosted verification: real Sarvam interpretation returned two dated symptom facts, including explicit absence and an approximate clock time. Welcome, setup, Capture, Review, timing editing, first-note confirmation, email entry and Menu passed at 320, 390, 768 and 1440 px, with no horizontal overflow, small active targets, low text contrast or browser errors. Timing fields were populated; cancelling restored review. No login email was sent and no permanent live record was saved. Phone-width Review and timing screenshots were inspected.
- Next device check: open https://aware-starfish-233.convex.site on a phone. Check voice/text, saving, existing timeline, cancelling an edit, Summary highlights/full readings, Copy text and native sharing. Before public sharing, complete the core flow logged out on mobile data.

## Completed V1.1 milestones

| # | Milestone | Done when |
|---|---|---|
| 16 | **Fact types at capture** — interpretation returns type, symptom name, measurement kind/value/unit; validated; shown in Record details; correctable via Change; safe one-time metadata classification of existing live records, including those entered during testing | New and existing facts carry a valid type without changing original facts, timing or corrections; classification retries are safe; invalid AI output falls back to `other`; Change can correct type |
| 17 | **Summary on stored types** — grouping in code; 90-day max replaces the 40-observation cap; overview candidates computed in code for any symptom; one short AI call phrases them; template fallback | A 6-week period with 120+ facts prepares; non-listed symptoms (e.g. swelling) get overview lines; AI failure still shows a template overview |
| 18 | **Concise summary and share text** — maximum 1,500 characters; "View all details" opens full measurements and details one click deeper | Generated and edited sharing text stay within 1,500 characters; extra details are disclosed and fully accessible in one click; source facts remain unchanged |
| 19 | **Delete account and record** — fresh code, immediate permanent cascade delete | All rows for the account are gone; deleted user lands on Welcome; signing in again starts fresh |
| 20 | **Privacy notice + Mixpanel (EU) tracking** — server-side events, opt-out switch, profile deletion on account deletion | Events from §8 of ARCHITECTURE.md appear in the EU project with no health content; opt-out stops events |
| 21 | **Launch check** — builder opens the live link on a phone, logged out, on mobile data, and completes the core flow | Complete - builder confirmed production functionality; V1 ready to share |

Milestone 20 setup: the EU project and `MIXPANEL_TOKEN` in Convex are configured. The builder confirmed the fictional event in the EU Events view. Privacy and tracking are live; opt-out and cleanup checks passed with simulated providers.

## Parked
Anything new goes into the right version in ROADMAP.md, not here.
