# ROADMAP.md

Everything beyond V1. **V2 is the next to be defined in detail; V3–V5 are tentative** and will be revisited using V1 tracking data and caregiver feedback. Every version extends the same Family → Person → Record → Timeline model; none becomes a separate product.

## V1.2 - caregiver feedback improvements

The approved release is now active in PLAN.md. Family switching remains V2; related observations within a capture are addressed in V1.2. Other future-version scope remains below.

## Launch sequence (from the original plan)

| Stage | Question it answers |
|---|---|
| Parents (V1–V2) | "How has Papa/Mama been since the last visit?" |
| Own health | "What has been happening with my health?" — symptoms, readings, reports, medicines, consultations |
| Children | "How is my child doing?" — symptoms, vaccinations, growth, visits |
| Insurance | "Does our health history affect what insurance covers?" |

Long-term questions the record should eventually answer: what happened over six months; what changed after a medicine started; results of the last three blood tests; a baby's first month; what to know before my own appointment; what our insurance means given this history.

---

## V2 — Ready for the visit, for both parents (to be detailed next)

**Product**
- "Since last visit": recorded doctor visit becomes the default summary start; ask the last visit date once if none is recorded.
- Second person (Mama and Papa) with person switching; "Add another person" asks only name + relationship.
- Measurements view: dated list / simple chart of BP, sugar etc., computed in code, no good/bad colours.
- Hindi/Hinglish capture; summary language choice; keep original-language transcript plus English.
- Next appointment date with one optional "prepare your summary" reminder (no daily check-ins).
- Recording countdown and auto-stop at 30 s that keeps what was said, instead of refusing.
- Evaluate a separate doctor-brief view vs the single Summary.
- PDF export of the summary; evaluate a short-lived read-only link for doctors.
- Data export for the caregiver.
- Home-screen install (PWA).
- Ask condition/treatment context after the first few updates, only if it improves organisation.

**Foundations**
- Per-account and per-anonymous-session AI limits alongside the global cap.
- Access checks via family membership (`canAccess(account, person, action)`) instead of single-owner checks.
- Store model, prompt and schema version on every AI output; fixed evaluation set of fictional cases run before any prompt/model change.
- All screen text in one resource file (translation-ready).
- CareNama-owned domain for the app and login email.
- Keep an unconfirmed first update through the switch to email for the code (verify the problem on phones first).
- Evaluate `sarvam-30b` for faster interpretation.

## V3 — Family coordination and documents (tentative)
- Second caregiver (e.g. a sibling) with roles: owner, editor, viewer; invitations.
- Audit log: who added, changed, deleted or shared what.
- Prescription and lab-report photo/PDF upload; extracted facts marked "from a document" and confirmed like any update. Restores the "document-derived" evidence type.
- Doctor details captured when preparing a brief.

## V4 — Own health (tentative)
- The caregiver's own record using the same capture, timeline and summary.
- Known conditions captured when they improve organisation.
- Longitudinal views (e.g. last three results of the same test).

## V5 — Children (tentative)
- Child records: symptoms, visits, growth, vaccinations.

## Later — Insurance (tentative)
- Read-only help understanding coverage in light of documented history. Check regulatory obligations in India before building advice-like features.

---

## Not planned (revisit only with strong evidence)
Mobile-number or password auth · WhatsApp bot/capture/report forwarding · ABHA/ABDM · doctor accounts or portal · appointment booking · medication reminders/adherence · prescription management · lab, pharmacy, wearable or device integrations · telemedicine · payments · marketplace or government services · fitness and nutrition tracking · automated health alerts · complex chronic-condition dashboards · generic health chatbot.

**Never:** diagnosis, treatment recommendations, required daily check-ins, streaks or health scores.

---

## Open questions for V2 definition
1. Has anyone besides the builder used V1 with a real parent? What did they capture, return to or drop?
2. What single metric defines V2 success?
3. Does the launch order (parents → own health → children → insurance) still hold?
4. Second person or second caregiver first?
5. Hindi/Hinglish in V2? Shared summary language?
6. Documents (prescriptions, reports) in V2 or V3?
7. Should the app know the next appointment date?
8. Is plain text enough for doctors, or PDF / read-only link?
9. When, if ever, will it charge? (affects account design)
10. Is Sarvam a firm commitment, or open to switching per task?
11. Is CareNama the final name; will a CareNama domain be bought?
12. Solo builder plus agent, or more contributors?
