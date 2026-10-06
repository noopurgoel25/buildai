# PRODUCT.md

V1 AI provider: Sarvam AI, using existing Sarvam credits. Saaras transcribes voice; `sarvam-105b` interprets health updates, asks clarifications, and will generate summaries and doctor briefs in their planned milestones. Calls run server-side in Convex, with no OpenAI API dependency or fallback. The user flow, confirmation requirement, deferred authentication, and prohibition on diagnosis or treatment advice remain unchanged.

V1 login-email delivery: Resend is approved only to deliver one-time sign-in codes. Convex Auth manages verification and sessions; Convex stores the health record and hosts the app. Login emails contain no health information.

### Approved capture and observation rules

One capture is one original text update or voice transcript, with one patient, source and device-local capture timestamp. It contains one or more observations. Each observation has its own supporting words, evidence, explicit presence/absence/uncertainty and symptom timing. An explicit “no dizziness” is data; silence or “no update” never becomes “no symptoms.” Absence of a report is not proof that the symptom was absent.

The caregiver reviews all observations together and confirms the whole update once, after any necessary timing clarification. They may correct or remove a detail from the pending update. The whole-update confirmation approves every displayed observation; save the capture together only when every remaining observation is confirmed; never save an empty capture. Preserve original input, AI interpretation and corrections. Authentication remains required before permanent storage.

“When it happened” belongs to each observation. Missing, vague or conflicting timing requires clarification; the caregiver may explicitly keep approximate timing or choose “I don’t remember.” A shared date applies to several observations only when the caregiver explicitly selects the named observations. Resolve clear relative dates against the original capture date and time zone, never against the later save date. “Morning” does not imply an exact clock time.

“Captured on” is the exact moment recording stops or a text update is submitted, displayed with seconds in the device time zone captured at that moment. Retries, clarification, editing and login do not change this timestamp. Existing records remain readable without automatically splitting or reinterpreting them. Timeline work follows this capture correction.

## 1\. The job

The product
The product is a Family Health Record: a continuously updated health record for every member of a family, designed to capture, organise and make sense of what happens across their healthcare journey.
The record is built from everyday health events — symptoms, observations, measurements, medications, doctor visits, reports, diagnoses, treatment changes and other relevant information — and becomes more useful as the family's health history grows.
The long-term job is:
When I need to understand the health of someone in my family, I WANT to have their relevant health history, current condition and care context in one place, SO I CAN make better-informed healthcare decisions, communicate accurately with doctors and manage their care with less effort.
The product is designed around people, not features.
Each family member has a persistent health profile and health timeline. New capabilities should enrich that same record rather than create disconnected feature-specific experiences.

The first use case
The first and most important use case is the caregiver flow:
"How has Papa been since the last visit?"
When a family member is undergoing treatment or recovering from an illness, the caregiver needs to remember what happened between doctor visits.
Today, this information is fragmented across:
• memory
• conversations
• WhatsApp
• phone notes
• Excel/Google Sheets
• paper notebooks
• prescriptions
• medical reports
The product should make it effortless to capture changes as they happen and then reconstruct the patient's health story when it matters.
The caregiver should be able to say:
"Papa's BP was 142/88 this morning and he didn't feel dizzy today."
The product should understand, structure and preserve that information in Papa's health record.
Before the next appointment, the product should be able to answer:
"How has Papa been since the last visit?"
with a concise, evidence-grounded summary of:
• what improved
• what worsened
• what was new
• what remained unchanged
• relevant measurements
• medication/treatment changes
• notable events
• questions or observations worth discussing with the doctor
The caregiver remains in control of what is recorded and what is shared.

The launch order
## Launch sequence beyond V1



The following are future expansion areas, not V1 scope:



Day 1 — Parents

Day 3 — Own health

Day 6 — Children

Day 30 — Insurance

\## V1 scope



V1 is limited to:



One caregiver → one parent → natural-language health capture → AI interpretation → confirmation → first value → email + OTP → persistent health record → timeline → summary → doctor brief → review → share.



Children, vaccinations, own-health use cases and insurance are future launch areas and are not part of the V1 build.
The product expands from one family health record use case to a broader Family Health OS through a sequence of increasingly important family-health jobs.
Day 1 — Parents:
"How has Papa/Mama been since the last visit?" Capture everyday health updates between appointments and generate a doctor-ready summary.
Day 3 — Your own health:
"What has been happening with my health?" Use the same family health record for personal symptoms, measurements, reports, medications, consultations and longitudinal health history.
Day 6 — Children:
"How is my child doing?" Build a health record around symptoms, vaccinations, growth, doctor visits and other child-care events.
Day 30 — Insurance questions:
"Does my family's health history/condition affect what insurance covers or what I should consider?" Connect the family's health record and documented history to insurance-related questions, coverage understanding and future healthcare planning.
These dates are the intended launch sequence for the build, not separate products. Each new use case operates on the same underlying Family → Person → Health Record → Health Timeline → AI foundation.

Who, by situation
The initial user is:
A family member who has taken responsibility for managing or coordinating another family member's healthcare.
For launch, this is primarily an adult child caring for an ageing parent who:
• has an ongoing treatment or recovery journey
• has recurring doctor visits
• experiences symptoms or changes between visits
• needs someone to remember and communicate what happened
• may have health information spread across multiple places
The user may live with the patient or coordinate their care remotely.
The patient does not need to actively use the product for the first use case to work.
Over time, the same product expands naturally to:
• parents caring for a newborn
• individuals managing their own health
• families managing healthcare and insurance decisions together

Today they hire
There is no single product being replaced.
They currently hire a combination of:
• their own memory
• the patient's memory
• conversations with family members
• WhatsApp
• phone notes
• Excel/Google Sheets
• paper notebooks
• photos and PDFs of medical reports
• prescriptions
• emails
• hospital/lab portals
Before an appointment, they manually reconstruct the story from these sources.
The product replaces this fragmented system with a persistent family health record that continuously accumulates relevant health events.

More than one person in the product?
Yes.
Family is the top-level product object.
A family can contain multiple people, each with their own health record.
For example:
Family
• Papa
• Mama
• Child
• Me
Each person has:
• Personal health profile
• Health timeline
• Symptoms and observations
• Measurements
• Medications
• Reports
• Doctor visits
• Treatment history
• Relevant care events
The same underlying model should support every launch use case.
The first build should optimize for:
One caregiver → one parent
but the architecture should not assume that the product is only for caregivers or only for chronic illness.

What needs doing
The product needs to help the user:
1. Create and maintain a health record for a family member.
2. Capture health information with minimal effort.
3. Preserve health events with their relevant context and time.
4. Organize information into a longitudinal health timeline.
5. Understand what has changed over time.
6. Reconstruct the patient's health story before a doctor visit.
7. Communicate that story accurately to the doctor.
8. Eventually manage the broader healthcare journey for the family member.
9. Eventually use the same record to answer healthcare and insurance-related questions.
The first use case concentrates these jobs into one simple question:
"How has Papa been since the last visit?"

How they want to feel
The user wants to feel:
• Relieved that important information is not being forgotten.
• Prepared before a doctor's appointment.
• Confident that they can explain what happened.
• In control of their family's health information.
• Less anxious about missing something important.
• Less burdened by healthcare administration.
• Reassured that their family's health history is available when they need it.
The product should feel like:
"Someone is helping me remember and organize this."
not:
"I have another health app to maintain."

How they want to look to others
To the patient:
"I'm keeping track of your health properly."
To the doctor:
"I can give you a clear picture of what has happened."
To other family members:
"I know what is going on and can help coordinate the care."
For their own health:
"I understand my own health history rather than having to reconstruct it every time."

The long-term job
As the product expands beyond the first caregiver use case, the fundamental job remains the same:
Keep the family's health story continuously available, understandable and actionable.
The product should eventually answer questions such as:
"How has Papa been since his last visit?"
"What happened with Mama's health over the last six months?"
"What changed after the medication was started?"
"What were the results of my last three blood tests?"
"What happened during my baby's first month?"
"What health information should I know before my own appointment?"
"What should I understand about my family's insurance coverage given this health history?"
These are different jobs on the surface, but they all use the same underlying asset:
The Family Health Record

The one we serve first
For V1: A caregiver responsible for an ageing parent who needs to answer "How has Papa/Mama been since the last doctor visit?" accurately and without relying on memory.
The product we build underneath it: A persistent Family Health Record that can eventually become the family's Health OS.

\---

## 2\. The switch

### What they'd fire

Primarily:

> \*\*Their memory + scattered notes + last-minute reconstruction before the doctor visit.\*\*

They are not necessarily replacing a single app.

They are replacing a messy system made up of:

* memory
* WhatsApp
* notes
* spreadsheets
* paper
* conversations
* reports

The product wins when it becomes the **single place where the caregiver remembers what happened between visits.**

### The forces that matter

#### Push — outside them

The current system breaks down at the exact moment information matters.

Before a doctor visit:

* They remember recent events better than older ones.
* Small but potentially relevant symptoms have been forgotten.
* Measurements are scattered.
* Family members remember different things.
* They spend time searching WhatsApp and notes.
* They are unsure whether they have told the doctor everything.
* The doctor gets a compressed and incomplete version of the patient's progress.

> "I know things happened, but I can't remember everything that happened since the last appointment."

#### Pull — inside them

They want to walk into the doctor's appointment feeling prepared.

> "I want to be able to tell the doctor exactly what happened."

They want a reliable health memory without having to maintain a spreadsheet or diary.

> "I want everything important to be there without me having to organize it."

#### Anxiety — the risk of trying us

The caregiver is worried that:

* The AI will misunderstand something they said.
* A health update will be recorded against the wrong person.
* Important information will disappear.
* The AI will make a medical conclusion that they don't agree with.
* They will have to spend more time correcting the product than simply writing a note themselves.

The most important V1 anxiety to remove:

> \*\*"If I tell this app something important about my parent's health, will it record and preserve it correctly?"\*\*

#### Habit — the way they already do it

When something happens, they naturally:

* tell another family member,
* send a WhatsApp message,
* make a mental note,
* write something in Notes,
* or do nothing.

Before the appointment, they search backwards through those same places.

### What the product does about each

**Push →** Gives every health update a permanent place in the patient's timeline so the caregiver doesn't have to reconstruct history later.

**Pull →** Automatically turns small observations into a clear summary of what changed since the last visit.

**Anxiety →** Shows exactly what the AI understood before saving and lets the caregiver correct it. The product never silently changes or invents a health event.

**Habit →** Makes capturing an update as easy as speaking naturally: "Mom felt dizzy after lunch today."

### The one worry onboarding must remove

> \*\*"I don't want another health app that makes me fill forms and maintain it. I just want to tell it what happened and know that it will remember."\*\*

\---

## 3\. The core flow

### Today

What they do now, before the product:

1. Something happens to the patient.
2. The patient tells the caregiver, or the caregiver notices it.
3. The caregiver decides whether it is worth remembering.
4. They make a mental note, send themselves/a family member a WhatsApp message, write it in Notes, update Excel, or do nothing.
5. Over the following weeks, more events happen.
6. Some are documented; many aren't.
7. The frequency of documentation decreases when the patient appears better.
8. A doctor appointment approaches.
9. The caregiver tries to remember what happened since the last appointment.
10. They search WhatsApp, Notes, Excel, reports and conversations.
11. The caregiver and patient discuss what they remember.
12. The doctor asks: "How have they been?"
13. The caregiver gives a short verbal summary dominated by recent events.
14. Reports may be shown, but smaller day-to-day observations are often skipped.
15. The doctor makes a treatment decision with an incomplete picture of the period between visits.

**Where it ends today:**

The appointment is completed, but the patient's complete experience between visits has not been reliably preserved or communicated.

\---

### With my product

1. **Something happens.**

   * Mom feels dizzy.
   * BP is higher than usual.
   * Dad says his appetite has improved.
   * A symptom disappears.
   * The patient reports feeling unusually tired.
2. **The caregiver tells the product naturally.**

   * Voice: "Mom felt dizzy after lunch today."
   * Or text: "Mom's BP was 142/88 this morning."
3. **The product understands the update.**
AI identifies the relevant patient, event type, information and date/time.
4. **The product shows what it understood.**

   Example:

> \*\*Mom\*\*
   >
   > Dizziness  
   > Today, after lunch
   >
   > \[Save] \[Edit]

5. **The caregiver confirms or corrects it.**
6. **The product shows the confirmed event as the first item in the patient's health story.**
7. **This is the first value. The event becomes part of the persistent health record only after the caregiver completes email + OTP authentication.**
8. **The caregiver continues with their day.**

   No forms.

   No required daily check-in.

   No need to categorize the event manually.

8. **More events accumulate naturally.**
9. **The caregiver opens the patient's timeline when they want to remember what happened.**
10. **AI organizes the accumulated information.**

    Example:

> "Mom reported dizziness 3 times since 14 September. Episodes were recorded primarily after meals. BP has decreased overall during the same period."

11. **Before the doctor visit, the caregiver asks the product to share a summary since the last visit/or from an earlier date**
12. **AI creates a doctor-ready summary based only on information recorded in the product.**
13. **The caregiver reviews and edits the summary.**
14. **The caregiver shares the summary with the doctor.**
15. **The caregiver enters the next care period with the previous history preserved.**

### The job done, in their terms

> \*\*"I can tell the doctor what actually happened since the last visit without relying on my memory."\*\*

### Things it takes to get the job done today

**8–12+ actions across multiple places**, depending on the caregiver.

### With my product

**1 primary action per health update:**

> \*\*Tell the product what happened.\*\*

And before an appointment:

> \*\*Prepare → Review → Share\*\*

\---

### What must not happen

**Step 3:** The caregiver must not be forced to complete a medical form before recording an observation.

**Step 3:** The product must not require the caregiver to know whether something is a "symptom," "vital," "event" or another category before capturing it.

**Step 4:** AI must not silently infer or invent medically significant information.

**Step 4:** If the patient is ambiguous, the product must ask rather than guess.

**Step 5:** The user must be able to see what was recorded and correct it.

**Step 6:** The product must not turn "no update" into "no symptoms."

**Step 10:** The summary must distinguish between:

* measured information,
* patient-reported information,
* caregiver observations,
* and information extracted from documents.

**Step 12:** The product must not present an AI-generated summary as a medical diagnosis or treatment recommendation.

**Step 13:** The caregiver must remain in control of what is shared with the doctor.

\---

### Other flows

#### Correct an event

Timeline → Event → Edit → Save

#### Delete an event

Timeline → Event → Delete → Confirm

#### Review history

Patient → Timeline → Select period → View events

#### Generate summary

Patient → Since last visit / selected period → AI summary → Review

#### Share summary

AI summary → Review → Share

#### Future flow: Create another patient profile

Family → Add person → Basic identity/relationship → Begin capturing

These flows should not become separate products. They all operate on the same underlying **patient + health timeline + health event** model.

\---

## 4\. Onboarding

### First value

The first value is not the dashboard.

It is:

> \*\*The first health event successfully captured, confirmed and shown as the start of the patient's health story.\*\*

The first event is demonstrated before authentication. It becomes part of the persistent health record only after the user completes email + OTP authentication.

Example:

The caregiver says:

> "Mom's BP was 142/88 this morning and she complained of slight dizziness."

The product responds:

> Here's what I understood
>
> Mom
> BP: 142/88
> Symptom: Slight dizziness
> When: Today, morning
>
> \[Save] \[Edit]

After confirmation:

> Mom's health story starts here.



Next: Keep this health record for next time.

Sign in with email + OTP to make the record persistent.

To experience the first value:

1. Patient's name.
2. Relationship to patient.
3. One health update.

After the user confirms the first health event, ask for:

4. Email + OTP authentication.

Authentication is required before the health record becomes persistent.

### The worry it removes

> \*\*"I don't want another app that asks me to fill out a profile before I can use it."\*\*

Authentication should feel like a lightweight step required to securely remember the health information, not like a lengthy registration process.

The first health update should happen within minutes of opening the product.

### From opening the link to the first value

#### 1\. Landing / entry

User sees:

> \*\*Remember what happens between doctor visits.\*\*
>
> Tell us what happened. We'll remember it for the next appointment.
>
> \[Get started]

Removes:

> "What is this for?"

\---

#### 2\. Create first patient

Ask:

> \*\*Who are you keeping track of?\*\*

* Name
* Relationship

Removes:

> "Do I need to build a complete medical profile?"

Answer: No.

\---

#### 3\. First capture

Ask:

> \*\*Who are you keeping track of?\*\*

* Name
* Relationship

Removes:

> "Do I need to build a complete medical profile?"

Answer: No.

\---

#### 3\. First capture

Immediately ask:

> \*\*What happened?\*\*

Primary action:

🎙️ **Tell me**

Secondary:

⌨️ **Type it**

Removes:

> "How am I supposed to use this?"

\---

#### 4\. AI interpretation

Show exactly what the product understood.

Example:

> \*\*Mom\*\*
>
> Dizziness after lunch
>
> Today
>
> \[Save] \[Edit]

Removes:

> "Will the AI record this correctly?"

\---

#### 5\. First value

After saving:

> Mom's health story starts here.

Here's what you've recorded so far.
>

### 6\. Authenticate after first value

After the user confirms the first event and sees the first value, ask for:

> \*\*Keep this health record for next time.\*\*
>
> Enter your email
>
> \[Continue]

Then verify the email OTP. Once authenticated, persist the health record and continue to the patient's timeline.

Authentication is email + OTP only. No password or mobile-number authentication.

### Returning to the product

When the user returns later:

1. Authenticate if the session has expired.
2. Restore the caregiver's family health record.
3. Open the most recently used patient.
4. Allow the user to capture another health update immediately.

The user should not have to recreate the patient or repeat onboarding.

### What we don't ask on day one

Do not ask for:

* Age
* Gender
* Blood group
* Medical history
* Diagnoses
* Allergies
* Medication list
* Doctor details
* Hospital details
* ABHA number
* Address
* Insurance information
* Wearable permissions
* Contacts
* Notifications
* Health goals
* Full family tree
* Profile photo
* App tour

None of these is required to prove the V1 job.

### What we ask later, and when

**Patient condition / treatment context**  
After the first few health events, when it can improve interpretation.

**Last doctor visit**  
When the user wants to generate a "since last visit" summary.

**Known conditions**  
When the user begins capturing events where condition context would materially improve organisation.

**Additional family members**  
When the user chooses "Add another person."

**Doctor details**  
When the user prepares or shares a doctor brief.

## 5\. V1

### Does — the must haves

#### 1\. One caregiver can create one patient profile

Minimum:

* Patient name
* Relationship

The architecture should support multiple patients later.

\---

#### 2\. One caregiver can capture a health update using natural language

Input:

* Voice
* Text

The user does not need to select a category first.

Examples:

> "Mom felt dizzy this morning."

> "Dad's sugar was 168 after breakfast."

> "Mom seems much better today."

> "Dad complained of knee pain again."

\---

#### 3\. AI converts the update into a structured health event

The event should capture, where available:

* Patient
* Date
* Time
* What happened
* Measurement/value
* Symptom/observation
* Context
* Source

The AI must preserve uncertainty.

Example:

> "Mom seems much better."

should remain a caregiver observation, not become:

> "Patient's condition improved."

\---

#### 4\. User confirms before the event becomes permanent

The product shows:

> \*\*Here's what I understood\*\*

and provides:

* Save
* Edit

The user must remain in control.

\---

#### 5\. Every saved event appears in a chronological health timeline

Example:

**14 Oct**

* BP 138/86
* Mild dizziness after lunch

**12 Oct**

* Felt energetic

**8 Oct**

* Headache

The timeline is the primary persistent record in V1.

\---

#### 6\. User can view and edit previous events

Minimum capabilities:

* Open event
* Edit
* Delete

\---

#### 7\. AI can summarize the patient's history over a selected period

At minimum:

* Since last visit

The summary must be grounded only in recorded information.

\---

#### 8\. AI can identify changes and patterns without diagnosing

Example:

> "Dizziness was recorded three times in the last 30 days. Two episodes occurred after lunch."

Not:

> "Your mother has a neurological problem."

The product surfaces information; it does not diagnose.

\---

#### 9\. User can generate a doctor-ready brief

The brief should contain:

* Period covered
* Overall progress
* Improvements
* Worsening/new symptoms
* Notable observations
* Recorded measurements
* Important events
* Questions/points to discuss

The user reviews the brief before sharing.

\---

#### 10\. User can share the doctor brief

V1 should support at least one simple sharing mechanism.

Preferred:

**Share → WhatsApp / system share sheet**

The doctor brief should be concise and readable without requiring the doctor to install the product.

\---

#### 11\. Data persists

The user can close the product, return later, and see the same patient and timeline.

\---

### Doesn't — not this sprint

These are explicitly parked, not forgotten.

* Multiple family members in the UI
* Multiple caregivers
* Caregiver permissions
* WhatsApp bot/agent
* WhatsApp report forwarding
* PDF/report ingestion
* OCR
* ABHA/ABDM integration
* Doctor accounts
* Doctor portal
* Appointment booking
* Medication reminders
* Medication adherence tracking
* Prescription management
* Lab integrations
* Pharmacy integrations
* Wearable integrations
* Insurance
* Telemedicine
* Health payments
* Generic AI health chatbot
* Medical diagnosis
* Treatment recommendations
* Automated medical alerts
* Government health services
* Health marketplace
* Fitness
* Nutrition
* Vaccination tracking
* Complex chronic-condition dashboards

### Nice to have

Only after the must-haves work:

* Basic measurement chart
* Suggested event categories after capture
* "Since last visit" as the default summary period
* Multiple input languages
* Follow-up question from AI when context is missing
* Basic doctor-brief formatting
* Export to PDF

### How I'll know it worked

Not:

> "Users said they like it."

Instead:

1. A caregiver captures multiple real health events without being prompted to complete a form.
2. They return to the same patient timeline later.
3. They use the timeline to recall earlier events.
4. They generate a summary before an appointment.
5. They edit the AI summary rather than rewriting it from scratch.
6. They share the summary with another person or doctor.
7. After the appointment, they return to the same patient profile and continue recording events.

### The strongest behavioral signal

> \*\*A caregiver uses the product for a second doctor-visit cycle without being reminded or incentivized.\*\*

That proves the product is becoming part of the care routine rather than being a novelty.

\---

## 6\. The riskiest guess

### If this is false, the product is pointless

> \*\*Caregivers experience enough loss of health information between doctor visits that they are willing to tell an AI what happened when something changes, provided doing so is easier than their current workaround.\*\*

A secondary critical assumption:

> \*\*A doctor-ready summary of these accumulated observations is valuable enough that caregivers will return to the product before future appointments.\*\*

### Thirty-minute check, no code

Before building the full product, run a concierge test with 4-5 caregivers.

Give each person a simple way to send health updates over one week using voice or text, using WhatsApp only as the research interface if necessary.

Do not ask them to learn a new tracking system.

Do not treat WhatsApp integration as part of the V1 product.

Ask them to send updates exactly as they naturally would:

> "Mom felt dizzy today."

> "Dad's BP was 150/90."

> "Mom is feeling much better."

At the end of the period, manually generate an AI-assisted "Since your last visit" summary.

Then ask the caregiver to use the summary to answer:

> \*\*"How has the patient been since the last doctor visit?"\*\*

Measure:

* How many updates they naturally sent.
* Whether they continued after the first day.
* Whether they corrected the AI's interpretation.
* Whether the summary contained information they had forgotten.
* Whether they would use the summary before a real appointment.
* Whether they would share it with the doctor.
* Whether they would continue using the system after the appointment.

### What would validate the idea

Strong validation:

* Caregivers naturally send multiple updates without being reminded.
* They say the system captured things they would otherwise have forgotten.
* The generated summary surfaces information they did not remember immediately.
* They prefer the summary to reconstructing the story manually.
* They want to continue using it for the next appointment.

Weak validation:

* People say "this is a good idea."
* People like the interface.
* People say they might use it someday.
* People only use it when explicitly prompted.

The product needs to demonstrate **behavioural adoption**, not conceptual approval.

\---

## 7\. Milestones

1\. I can see landing page and start product.

2\. I can create one patient with name and relationship.

3\. I can capture health update by voice or text.

4\. I can see AI understood and edit before saving.

5\. I can save confirmed health event and see first value.

6\. I can sign up with email + OTP so health record can persist.

7\. I can see patient timeline.

8\. I can edit/delete previous event.

9\. I can capture different types through same workflow.

10\. I can get evidence-grounded summary for selected period.

11\. I can see meaningful changes/patterns without diagnosis/treatment advice.

12\. I can generate concise doctor-ready brief.

13\. I can review/edit doctor brief.

14\. I can share via native sharing mechanism.

15\. I can return and continue same patient/timeline. I can immediately capture another health event.

\---



The core V1 loop works end-to-end:

Something happens → I tell the product → AI understands → I confirm → it becomes part of the patient's health story → I return later → I understand what changed → AI prepares my doctor brief → I review → I share → I continue the same health story after the appointment.

Milestone 8 approved: caregivers can correct a saved capture through whole-update review or explicitly delete the entire capture. Corrections preserve the original input, source, AI interpretation, initial saved details and device-local capture timestamp; occurrence timing remains editable. Deletion removes the whole capture including its preserved initial details, while keeping the patient's record and timeline. Server ownership and version checks protect both actions; retries must not duplicate corrections or recreate deleted notes.

Milestone 9 approved care context: the existing voice/text capture, whole-update review and patient timeline support reported medication starts, stops and dose changes, doctor visits, and changes in appetite, sleep or energy. Keep a reported instruction with its speaker and preserve supplied medicine names, old/new doses, units, frequency and uncertainty. Missing details stay missing; never turn the record into advice, diagnosis, prescription management or a medication schedule. A medication dose is not a measured vital. No category selection, extra forms or new destination is required.

Approved returning-account correction: a confirmed capture prepared before sign-in may be appended to the existing patient only after both name and relationship match (case/whitespace-insensitive) and the caregiver explicitly confirms the same person. Matching is scoped to the signed-in account and rechecked server-side at saving. Names alone never establish identity. Keep original input, observations and capture time; retry without duplication or another AI call. Different details retain the one-person limit and leave the prepared update unsaved.
