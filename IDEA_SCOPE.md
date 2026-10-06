IDEA LOCK · Build Sprint

The idea, in one line: The product is a Family Health Record: a continuously updated health record for every member of a family, designed to capture, organise and make sense of what happens across their healthcare journey.

The record is built from everyday health events — symptoms, observations, measurements, medications, doctor visits, reports, diagnoses, treatment changes and other relevant information — and becomes more useful as the family's health history grows.
Why me: the audience trusts me; I have publicly documented that I taken a career break to perform caregiving duties for my ageing parents.

GOAL
When I need to understand the health of someone in my family, I WANT to have their relevant health history, current condition and care context in one place, SO I CAN make better-informed healthcare decisions, communicate accurately with doctors and manage their care with less effort.

USER
The trigger (when the pain hits): At the doctor visit, when the doctor asks how the patient is feeling, not all information is shared with the doctor. Due to recency effect, the caregiver or the patient only informs of major improvements or deviations in the last few days. What happened in the first 2-3 weeks after the last doctor visit is not documented anywhere.

Today's path, step by step (including not solving it at all):

1\. Something happens to the patient.

2\. The patient tells the caregiver, or the caregiver notices it.

3\. The caregiver decides whether it is worth remembering.

4\. They make a mental note, send themselves/a family member a WhatsApp message, write it in Notes, update Excel, or do nothing.

5\. Over the following weeks, more events happen.

6\. Some are documented; many aren't.

7\. The frequency of documentation decreases when the patient appears better.

8\. A doctor appointment approaches.

9\. The caregiver tries to remember what happened since the last appointment.

10\. They search WhatsApp, Notes, Excel, reports and conversations.

11\. The caregiver and patient discuss what they remember.

12\. The doctor asks: "How have they been?"

13\. The caregiver gives a short verbal summary dominated by recent events.

14\. Reports may be shown, but smaller day-to-day observations are often skipped.

15\. The doctor makes a treatment decision with an incomplete picture of the period between visits.

\*\*Where it ends today:\*\*

The appointment is completed, but the patient's complete experience between visits has not been reliably preserved or communicated.



Who they trust on this decision: Themselves and the doctor.

Would they pay? (what exists today that people pay for): Maybe; Apps like Eka Care exist which store patients historical and latest reports, scans and health data like heart rate from wearables but the UX is extremely poor and not user friendly. They have random ads on every page and journey and a banner to prompt to upgrade to paid plan. They also don't have the option to add change in symptoms with date stamp which can be recorded and assimilated to show some trend in patient's health.

PRODUCT
Onboarding

The initial V1 flow is designed to demonstrate first value before asking for authentication:

Landing → Patient setup → Capture → AI interpretation → Confirm → First value → Email + OTP authentication → persistent health record.

Authentication is email + OTP only. No mobile-number authentication or password authentication.

The user should not be asked to sign up before experiencing the core capture → AI interpretation → confirmation flow.

The core loop (user stories, written by me):

1. \*\*Something happens.\*\*



&#x20;  \* Mom feels dizzy.

&#x20;  \* BP is higher than usual.

&#x20;  \* Dad says his appetite has improved.

&#x20;  \* A symptom disappears.

&#x20;  \* The patient reports feeling unusually tired.

2\. \*\*The caregiver tells the product naturally.\*\*



&#x20;  \* Voice: "Mom felt dizzy after lunch today."

&#x20;  \* Or text: "Mom's BP was 142/88 this morning."

3\. \*\*The product understands the update.\*\*

AI identifies the relevant patient, event type, information and date/time.

4\. \*\*The product shows what it understood.\*\*



&#x20;  Example:



> \\\\\\\*\\\\\\\*Mom\\\\\\\*\\\\\\\*

&#x20;  >

&#x20;  > Dizziness

&#x20;  > Today, after lunch

&#x20;  >

&#x20;  > \\\[Save] \\\[Edit]



5\. \*\*The caregiver confirms or corrects it.\*\*

6\. \*\*The product shows the confirmed event as the first item in the patient's health story, then asks the caregiver to authenticate before making the health record persistent.\*\*

7\. \*\*The caregiver continues with their day.\*\*



&#x20;  No forms.



&#x20;  No required daily check-in.



&#x20;  No need to categorize the event manually.



8\. \*\*More events accumulate naturally.\*\*

9\. \*\*The caregiver opens the patient's timeline when they want to remember what happened.\*\*

10\. \*\*AI organizes the accumulated information.\*\*



&#x20;   Example:



> "Mom reported dizziness 3 times since 14 September. Episodes were recorded primarily after meals. BP has decreased overall during the same period."



11\. \*\*Before the doctor visit, the caregiver asks the product to share a summary since the last visit/or from an earlier date\*\*

12\. \*\*AI creates a doctor-ready summary based only on information recorded in the product.\*\*

13\. \*\*The caregiver reviews and edits the summary.\*\*

14\. \*\*The caregiver shares the summary with the doctor.\*\*

15\. \*\*The caregiver enters the next care period with the previous history preserved.\*\*



\### The job done, in their terms



> \\\\\\\*\\\\\\\*"I can tell the doctor what actually happened since the last visit without relying on my memory."\\\\\\\*\\\\\\\*

The AI-first part (onboarding, engagement or the core loop):

AI converts the update into a structured health event



The event should capture, where available:



\* Patient

\* Date

\* Time

\* What happened

\* Measurement/value

\* Symptom/observation

\* Context

\* Source



The AI must preserve uncertainty.



Example:



> "Mom seems much better."



should remain a caregiver observation, not become:



> "Patient's condition improved."



MARKET
Competitors: Eka Care (not the same use case)
Size and fit: 80+ people interacted with my post on social media and I received in-mails and messages sharing support for my journey.

