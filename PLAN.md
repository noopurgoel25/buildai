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
13. I can review and edit the doctor brief before sharing.
14. I can share the doctor brief using the device's native sharing mechanism.
15. I can return to the product and continue with the same patient and timeline.

Last: I can close it, reopen it, and my data is still there.

Approved correction before milestone 7: one capture contains observations approved together in one whole-update review, with individual symptom timing and a shared device-local capture timestamp. Preserve explicit negative statements; clarify missing/conflicting timing without guessing, allow confirmed approximate/unknown timing, and save all remaining observations together. The approved CareNama redesign reduces visible bookkeeping with plain facts, optional Record details and empathetic wording across the existing flow. Milestone 7 now includes the timeline and adding further updates through the existing flow. Historical editing/deletion and additional kinds of capture remain in their existing milestones.

Parked (not now):
- [ ] Group linked observations into one entry (for example BP with explicit no dizziness), with caregiver review of grouping; keep distinct occasions separate without inferring medical causes.
- [ ] Multiple patients / full family management UI
- [ ] Multiple caregivers and permissions
- [ ] Reports, OCR, ABHA/ABDM, doctor portal, booking
- [ ] Medication reminders, prescription management, lab/pharmacy/wearable integrations
- [ ] Insurance, telemedicine, payments, alerts, fitness/nutrition
- [ ] Generic chatbot, diagnosis or treatment recommendations
- [ ] WhatsApp capture/bot and other integrations

Approved milestone 9 scope: reported medication starts/stops/dose changes, doctor visits and appetite/sleep/energy changes through the existing voice/text capture, review and timeline. Preserve who said what, supplied values and uncertainty; no inferred prescriptions or medical advice.
