# PROGRESS.md

One line per confirmed milestone. Detailed session notes up to 2026-10-08: `archive/2026-10-08/PROGRESS.md`.

| Date | Milestone | Status |
|---|---|---|
| 2026-10-05 | 1 · Landing and Get started | Live |
| 2026-10-05 | 2 · Temporary person setup (name, relationship) | Live |
| 2026-10-06 | 3–4 · Voice/text capture, AI review and edit | Live (4b64167) |
| 2026-10-06 | 5 · Confirmation and temporary first value | Live (4b08020) |
| 2026-10-06 | 6 · Email + code sign-in and persistent first update; Resend domain verified | Live |
| 2026-10-06 | Capture/observation model + HTTP-preview ID fix | Live |
| 2026-10-06 | CareNama redesign | Live |
| 2026-10-06 | 7 · Timeline + Add update | Live |
| 2026-10-06 | 8 · Change and delete saved updates | Live |
| 2026-10-06 | One-person-per-account messaging | Live |
| 2026-10-06 | 9–11 · Care context, same-person recovery, Summary for a period, overview, compact timeline, sign-in recheck fix | Live (0dac99b) |
| 2026-10-06 | 12 · Doctor-brief content merged into Summary | Live (e126b50) |
| 2026-10-06 | 13–14 · Review, edit and share Summary (+ phone copy fix) | Live (9bae7f3) |
| 2026-10-06 | 15 · Return and continue | Live (86e8efc) |
| 2026-10-06 | Six-digit sign-in code | Live (6633d01) |
| 2026-10-06 | Timing-screen checkbox layout | Live (8cf451f) |
| 2026-10-08 | Docs restructured; V1.1 scope agreed | Docs only |
| 2026-10-09 | 16-20 ? Combined preview testing | Builder confirmed all scenarios; signed-in empty-account setup issue identified and fixed, awaiting phone recheck before publishing |
| 2026-10-09 | 20 - EU analytics event verification | Builder confirmed fictional landing event in EU Mixpanel; frontend awaits combined testing |

Latest checks: the signed-in setup/progress fix passes first-record saving, post-deletion recreation, draft-preserving Back, keyboard saving and layouts at 320/390/768/1440 px. 71 unit/server and 68 browser passed; 9 optional live-provider browser tests skipped. Earlier fictional capture and overview checks against real Sarvam passed without saving health records. Privacy, opt-out and account/profile cleanup checks use simulated providers and fictional accounts; no live login emails were sent or existing records removed. The builder confirmed combined Milestones 16-20 testing; the approved signed-in setup/progress fix awaits a phone recheck on `milestone-16-fact-labels`; Milestone 20 is implemented on that branch, with the EU project/token configured and a fictional landing event accepted by the real EU API; the Convex tracking action completed and the builder confirmed the event in the EU Events view; publishing awaits the signed-in setup/progress phone recheck. Layouts were checked at 320, 390, 768 and 1440 pixels; build and compatible backend push passed.
