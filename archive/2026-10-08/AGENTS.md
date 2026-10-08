# AGENTS.md

## 1\. How the product works

Interface: A mobile-first web app used primarily on a phone. The core action is: **tell the product what happened to someone you care for**, by voice or text.

Business logic: The user gives a natural-language health update. The system uses AI to identify the patient, date/time, event and relevant health information, shows the user what it understood, and saves the event to that patient's persistent health timeline only after confirmation.

Database: The product needs to remember the caregiver account, family, patient/person identity and relationship, health events, event dates/times, measurements, symptoms/observations, context, source type, AI interpretation and user corrections, plus the information needed to generate summaries and doctor briefs. The agent designs the tables around the Family → Person → Health Record → Health Timeline → Health Event model.

Third party:

* **Convex** — application backend, database, server-side functions/actions, authentication integration and server-side secrets. Keys/configuration live in Convex environment variables.
* **Convex Auth** — email-based authentication and OTP login. V1 uses email + OTP only; no mobile-number authentication and no password.
* **Sarvam AI** — Saaras for voice transcription and `sarvam-105b` for health-event interpretation, clarification, summaries and doctor briefs. AI calls run server-side in Convex actions. API credentials live in Convex environment variables. V1 uses existing Sarvam credits and has no OpenAI API dependency.

Not in v1:

* Mobile-number authentication
* Password authentication
* Multiple caregivers per patient
* Full multi-patient UI / family management
* WhatsApp bot or WhatsApp capture
* Medical report upload, OCR or document extraction
* ABHA/ABDM integration
* Doctor accounts or portals
* Appointment booking
* Medication adherence/reminders
* Prescription management
* Lab, pharmacy, wearable or device integrations
* Insurance functionality
* Telemedicine
* Payments
* Generic health chatbot
* Diagnosis or treatment recommendations
* Automated health alerts
* Fitness, nutrition or vaccination tracking
* Marketplace or government-service integrations
* Required daily check-ins, streaks or health scores

When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.

## 2\. How we work

* Read IDEA\_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before any screen work.
* Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.
* One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.
* If I ask for something new mid-milestone, add it to the parked list in PLAN.md and carry on.
* Never say "done" until you've seen it work (a test, or a screenshot at phone width) and told me how to check it on my phone.
* When I report a bug, find the cause before changing anything. Fix only that.
* When we add something new, write tests so what already works doesn't break. When I drop a feature, drop its tests.
* Build and test only in the mobile-first web app. Do not create a separate web test page or alternate interface.
* After I confirm a milestone works: commit, push, and add one line to PROGRESS.md.
* Never put a key or password in code, in a VITE\_ variable (those are sent to every visitor) or in a committed file.
* **If a product decision, interaction or requirement is unclear or conflicts with PRODUCT.md or DESIGN.md, stop and ask rather than guessing.**

## 3\. Shipping

Live link: \[https://aware-starfish-233.convex.site]

Repo: \[github.com/noopurgoel25/buildai], public

Deploy: npm run deploy. A push never deploys by itself. After I say a milestone works: commit, push, then deploy.

Keys:

* Convex Auth configuration lives in Convex environment variables for dev and prod.
* SARVAM\_API\_KEY lives in Convex environment variables for dev and prod.
* Never put keys in code, a VITE\_ variable or a committed file.
* Never ask me to paste a key into chat.

.gitignore covers .env.local.

Real people's data (health information, chats, names, email addresses, phone numbers or other identifying information) never goes in the repo, not even as a test file. Tests use made-up examples.

Every limit and every "is this allowed" check happens in a Convex function, never only on screen.

Before I share the link: I open it on my phone, logged out, on mobile data, and do the core flow once.

## 4\. The AI call

Model: Sarvam `sarvam-105b`. Use `reasoning_effort: null` to keep the bounded reply available within the token cap.

What goes in, and its limit:

* For voice input, Sarvam AI transcribes the user's spoken update before the health-event interpretation call.
* The AI receives the user's transcribed/text health update plus only the patient/timeline context needed for the current task.
* Keep prompts/context minimal and grounded in recorded information.
* Do not send unrelated family or health information to the model.
* Health-event interpretation should preserve uncertainty and distinguish measured, patient-reported, caregiver-observed and document-derived information.

Where it runs: A Convex action. Never in the interface.

Key: SARVAM\_API\_KEY in Convex environment variables, dev and prod. No separate OpenAI billing or fallback in V1.

Reply cap: `max_tokens: 500`. Request structured JSON and validate it server-side before showing an interpretation.

Calls cap: at most 100 AI calls an hour across the app, checked server-side in Convex.

When a cap is hit or the call fails:

* Show: **"Busy right now. Try again in a few minutes."**
* Do not save an unverified AI interpretation as a permanent health event.
* The user's original input must not be silently discarded.

Login: Email authentication with OTP through Convex Auth happens after the user reaches first value in the initial V1 flow. The user can experience the core capture → AI interpretation → confirmation flow before signup; authentication is required before the health record is made persistent. Returning users authenticate when required and are returned to their existing patient/timeline; they do not repeat patient setup.

The AI must never:

* Give a medical diagnosis.
* Recommend treatment, medication changes or other medical interventions.
* Invent or silently infer medically significant facts.
* Guess which family member an update refers to when the patient is ambiguous.
* Guess a date when the timing is materially ambiguous.
* Present an inference as a measured, reported or observed fact.
* Treat "no update" as "no symptoms."
* Present an AI-generated summary as a clinical verdict.
* Answer unrelated/off-topic questions as a general-purpose chatbot.

If the patient or date is ambiguous, ask a specific clarification question rather than guessing.

## 5\. Voice and transcription

Voice input: The user can speak a health update from the phone.

Transcription provider: Sarvam AI.

Key: SARVAM\_API\_KEY in Convex environment variables, dev and prod.

Where it runs: Server-side. The interface sends the recording/input through the application's backend flow; API credentials are never exposed to the browser.

While recording/transcribing:

* Show a clear listening/transcription state.
* Do not show live transcription in V1; show transcription after recording stops.
* Let the user stop, retry or switch to text.

If microphone access is blocked:

* Explain that microphone permission is required for voice capture.
* Provide text input as an immediate alternative.

If the recording is empty or transcription produces no usable text:

* Say that nothing was captured.
* Offer retry and text input.
* Never create an empty health event.

## 6\. Product rules the agent must preserve

* The record is the product; features enrich the patient's persistent health story.
* Capture before categorize.
* Voice is the fastest path; text is always available.
* AI shows what it understood before anything is saved as a health event.
* Do not require authentication before the first-value experience; ask for email + OTP after the user confirms the first event and before persistent storage.
* The first-value UI must never describe the event as permanently saved or imply that it will survive closing/reopening until authentication succeeds.
* Evidence beats inference.
* The caregiver controls recording, editing, deleting and sharing.
* Never silently guess the patient, date or medically significant meaning.
* Never make the user complete a medical form before capturing an observation.
* Never turn the product into a chatbot destination.
* Timeline over dashboard.
* No diagnosis or treatment advice in V1.
* No required daily maintenance, streaks, scores or similar engagement mechanics.
* Keep future Family Health OS complexity invisible in V1.
* New capabilities should strengthen the existing Family → Person → Health Record → Health Timeline → Health Event model rather than create disconnected feature destinations.
* Design and implementation must support the empty, loading, broken and done states defined in DESIGN.md.
* The product must be usable and understandable at phone width before desktop optimisation.

When a requirement conflicts with PRODUCT.md, DESIGN.md or this file, stop and ask before coding.
