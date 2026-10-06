# PLAN.md

Landing page first, one hour. Then the milestones from PRODUCT.md, riskiest part first, in its simplest form:

1. I can see the landing page and start the product.
2. I can create one patient with a name and relationship.
3. I can capture a health update by voice or text.
4. I can see what the AI understood and edit it before saving.
5. I can save the confirmed health event and see my first value.
6. I can sign up with email + OTP so my health record can persist.
7. I can see the patient's health timeline and add another update through the existing capture/review flow.
8. I can edit or delete a previous health event.
9. I can capture different kinds of health information through the same workflow.
10. I can get an evidence-grounded summary for a selected period.
11. I can see meaningful changes and patterns without diagnosis or treatment advice.
12. I can generate a concise doctor-ready brief.
13-14. I can review, edit and share the prepared Summary using the device's native sharing mechanism.
15. I can return to the product and continue with the same patient and timeline.

Last: I can close it, reopen it, and my data is still there.

Approved correction before milestone 7: one capture contains observations approved together in one whole-update review, with individual symptom timing and a shared device-local capture timestamp. Preserve explicit negative statements; clarify missing/conflicting timing without guessing, allow confirmed approximate/unknown timing, and save all remaining observations together. The approved CareNama redesign reduces visible bookkeeping with plain facts, optional Record details and empathetic wording across the existing flow. Milestone 7 now includes the timeline and adding further updates through the existing flow. Historical editing/deletion and additional kinds of capture remain in their existing milestones.

Parked (not now):
- [ ] Separate Summary and doctor-brief screens: evaluate after V1; keep one Summary view for now.
- [ ] Group linked observations into one entry (for example BP with explicit no dizziness), with caregiver review of grouping; keep distinct occasions separate without inferring medical causes.
- [ ] Multiple patients / full family management UI
- [ ] Multiple caregivers and permissions
- [ ] Reports, OCR, ABHA/ABDM, doctor portal, booking
- [ ] Medication reminders, prescription management, lab/pharmacy/wearable integrations
- [ ] Insurance, telemedicine, payments, alerts, fitness/nutrition
- [ ] Generic chatbot, diagnosis or treatment recommendations
- [ ] WhatsApp capture/bot and other integrations

Approved milestone 9 scope: reported medication starts/stops/dose changes, doctor visits and appetite/sleep/energy changes through the existing voice/text capture, review and timeline. Preserve who said what, supplied values and uncertainty; no inferred prescriptions or medical advice.

Approved flow correction during milestone 9: preserve a pre-sign-in capture for a matching existing patient and ask explicit same-person confirmation before appending. No multiple-person UI or automatic identity merge.

Approved milestone 10 scope: selected-period factual summaries beside the patient's timeline, based on saved notes and occurrence dates. Keep source references, explicit negatives, uncertainty and user corrections. Undated details recorded in the period appear separately. Changes/patterns and doctor briefs remain milestones 11 and 12.

Approved summary refinement and milestone 11 scope: a short source-linked overview of changes explicitly described in saved notes and cautious cross-date symptom mentions, followed by compact icon categories. Reported improvement/worsening retains exact wording and uncertainty; repeated symptom mentions count recorded days, never episodes. Later explicit absence is confined to that dated note, not gaps between records. Unsupported or unrelated notes receive neutral add-more-updates wording, never an overall health better/worse verdict. No presumed last-visit date, diagnosis, treatment advice, measurement-based clinical verdict, or doctor brief.

Current status (2026-10-06): milestones 1-11 published after user confirmation, including the compact timeline, source-linked overview and sign-in recheck correction. Next: milestone 12, concise doctor-ready brief based only on the selected patient’s saved notes for a chosen period.

Approved milestone 12 scope: generate a concise patient-bound doctor brief for a chosen occurrence-date period, accessible from the timeline or prepared summary. Reuse the owner-checked, bounded Sarvam summary snapshot; preserve source-linked progress, explicit reported improvement/worsening/new symptoms, other observations, exact measurements and recorded care wording. Discussion points use recorded questions or supported overview sources, not invented medical questions. Uncertain dates stay separate, and sparse/empty/oversized/error states remain honest. Up to three facts per section are shown initially; all remaining facts remain available in a disclosure. No saved brief, correction or sharing controls until milestones 13/14.

Approved V1 simplification (2026-10-06): one Summary entry and one prepared result serve everyday review and doctor visits. Remove separate doctor-visit navigation and brief preparation CTA. Keep the owner-protected brief API and source-based sections underneath; show explicit reported changes within existing categories and visit discussion notes in an optional disclosure. Reconsider separate views after V1. Preparation makes one bounded AI call.

Approved Summary correction (2026-10-06): an isolated reported better/worse entry is not a period overview. Only supported connections between multiple dated notes qualify; otherwise show neutral add-more-updates wording. Individual reported changes remain in their category. After preparation, show selected dates and Change dates in one compact row, with date inputs disclosed on demand and no repeated date heading.

Current release status (2026-10-06): milestones 1-12 published, with doctor-brief preparation merged into Summary. Next milestone: 13, review/edit the prepared Summary before sharing; native sharing remains milestone 14.

User-directed milestone merge (2026-10-06): combine milestones 13 and 14 into one review/edit/share journey within the existing Summary destination. No separate doctor-brief screen. Milestone 15 remains next after the combined milestone. Interaction approved: editable text preview, native share and Copy text fallback, with temporary draft edits only.

Approved combined milestones 13-14 (2026-10-06): inside Summary, Review & share opens the exact editable plain-text draft, then Share invokes the device native sharing menu. Copy text is the fallback, with manual selection if clipboard access is blocked. Draft edits stay only in the open page and never rewrite saved health events; Back to summary retains edits, while date changes/regeneration/leaving warn before clearing modified drafts. Server checks ownership, current period source membership/revisions, complete references and the 40,000-character bound before preparing or handing off text. New/changed/deleted selected notes require Summary to be prepared again. No extra AI call, public link, saved sharing artifact or automatic delivery. Blank drafts cannot be shared. Unknown timing and sparse-note limits remain explicit; phone-width errors/cancellation retain draft text. Device sharing requires a secure page; HTTP phone preview uses copying/manual selection.
