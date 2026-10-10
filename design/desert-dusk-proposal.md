# CareNama: Desert Dusk design proposal

**Approved design direction; implementation proceeds one milestone at a time.** The user approved the scope, sequence and screens, rejected the initial photograph and chose an original daughter-and-father caricature. This is the visual review reference, not a claim that every screen is implemented. Active milestones live in PLAN.md; current product rules remain in the owning product, design and architecture documents.

## Findings

The supplied screenshots show a welcome page that asks for an action before explaining useful inputs and outcomes; repeated links with equal weight; large headings and repeated source fields; useful Summary categories hidden one click deeper; inconsistent date formats; and related facts presented as disconnected blocks.

Source review confirms two issues beyond styling. Summary overview candidates exclude isolated symptoms and favour repeated topics, while its main screen hides grouped categories. Generic repeated wellbeing can therefore displace useful symptoms. Interpretation also overrides model presence/absence using broad word-matching rules: "not dizzy", "not improving" and "not sure" need different meanings. Keep strict source checks; replace broad meaning overrides with context-aware interpretation and regression cases.

The heartburn classified as daily wellbeing in the screenshot needs a fictional classification regression case. Trace the provider response and validation before claiming which step caused it. The data model already supports one capture with several observations; preserve that structure, dates and original words.

## Visual world

Warm support, clear reading and quiet confidence. The **held-light** logo is a small rising light held by two curved forms: simple geometry, not a character. Use original Indian family editorial caricature on Welcome, consistent SVG icons elsewhere, and restrained supportive motifs. No health scores, streaks or clinical good/bad colours.

| Role | Colour | Usage |
|---|---|---|
| Main action | #A2574F | White button text; approximately 5.23:1 contrast |
| Encouragement | #E68057 | Logo light and decorative surfaces; dark text |
| Support | #BF7587 | Accents/tinted surfaces; dark text |
| Current location | #993A8B | Active tabs, progress and links; white contrast approximately 6.30:1 |
| Paper | #FFF9F5 | Main background |
| Ink / secondary | #352A2B / #6F5B5B | Reading hierarchy |

Orange and rose do not support small white text. Keep the app's self-hosted Inter, clear heading scale and readable body text. Category colour never communicates severity.

The approved emotional reference is [the daughter embracing her mature father](https://www.istockphoto.com/photo/young-daughter-embracing-her-mature-father-stock-photo-gm1308614549-398542974). The user has no licensed download and chose an original caricature. Generated artwork uses fictional Indian adults and a warm painted treatment, without copying the stock subjects. Patient avatars remain initials; no health note or testimonial is attributed to the illustrated people. Style authority: design/style-anchor.md. The rejected Pexels photograph is excluded.

## Screen specification

| Screen | Proposed experience |
|---|---|
| Welcome | Explain the job; original family caricature; Say / Check / Keep orientation; specific examples on Capture; one Start a health note action and visible returning Sign in. No compulsory tour. |
| Person setup | Name and relationship as text fields; approved Person / Update / Review tracker; Continue to your update explains the next step. Signed-in empty accounts never sign in again. |
| Capture | Person visible; voice and text immediately available; first-use examples for symptoms, readings and everyday changes. No category selection. Explicit recording, stop and processing states; Review available after input. Short draft warning only after input starts. |
| Review | One capture container, related details together, individual dates retained. Source-grounded sequence, never invented causation. One Change action, primary Save, quiet Add something else. Signed-out saving explains verification; signed-in saving is direct. |
| Timeline | Compact dated entries with supportive category icons; one tappable entry per capture. Linked details spanning dates have a clear range. Timeline and Summary stay visible tabs; account links move into the menu. Full readings can remain visible here when relevant. |
| Summary | What stands out names meaningful symptoms and changes, even one-off events. Concise category highlights follow; each opens full details in one click. Measurement values stay deeper. Compact period control; one Review & share action, no separate doctor brief. |
| Editing | Current update populated; short timing rows open only the selected date editor. Advanced classification/source fields are collapsed. Preserve unchanged facts and corrections; show differences before applying rewritten input. Never silently rebuild a corrected note from its original transcript. |
| Details | Short story, individual dates, original note and one local capture timestamp. Full readings when present. Source/provenance expands on demand instead of repeated Recorded as / Evidence / Observation / Supporting words. Quiet Delete beside Change in this context, retaining confirmation. |
| Menu | Support, privacy and account choices grouped; single close control; account actions absent while signed out. Preserve drafts when opening; protect changed work before navigating away. |
| Email/code | One primary action; quiet Resend and Change email. First-note verification names the person and saving outcome; returning sign-in says Verify & continue. |

All journeys keep the logo in the same compact header. When needed, Back shares that row with the logo and menu; there is no separate Back row. Person context is a compact initials/name/relationship row. Back is an accessible arrow button, at least 44px, preserving in-page work. Returning updates retain the two-step Update / Review tracker; no duplicate step count. Support copy never promises an unsaved draft survives refresh. Family switching is invisible until V2 supplies real choices.

Menu implementation follows [W3C disclosure navigation guidance](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/): semantic links, expanded state, Escape, keyboard access and restored focus. Do not treat ordinary site links as a complex application menu.

## Timing, context and AI

- Store canonical occurrence dates, exact timestamp instants and original device time zones separately. Display **DD/MM/YYYY everywhere**, including period/date inputs; retain **seconds and the original local zone** for capture time. Do not replace stored instants with display strings or recompute historical dates on another device.
- Resolve "today" and "yesterday" from capture-local date. Separate date certainty from clock certainty: "around 5 today" has a known date even if its time needs clarification. Keep "morning" approximate; never invent 09:00.
- Vague/conflicting dates get one focused question and an honest approximate/unknown option. Do not transfer one observation's timing to unrelated siblings.
- Native date fields alone cannot guarantee display format. Use shared DD/MM/YYYY input with optional accessible calendar, server validation and [W3C date-picker guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).
- Related observations stay inside their capture. Longer notes may have reviewed context groups within that capture, grounded in supplied words. Invalid grouping falls back to the intact note and individually dated facts. Do not merge unrelated historical captures or infer medical causes.
- Preserve explicit "no dizziness" alongside the related BP note. Silence is never absence. Internal presence/absence/uncertainty stays for integrity; technical labels leave the default caregiver view.
- Sarvam interprets context through a versioned prompt, structured output and fictional regression examples. It does not automatically learn from corrections. Do not feed live health records into training or repo fixtures.

## Meaningful Summary

Distinguish **notable recorded facts** from **supported patterns**. One symptom can be a useful notable fact; a pattern needs multiple source dates/captures. Prioritise meaningful symptoms, treatment changes and visits rather than alphabetical topics or generic day counts. Sources remain accessible.

Sparse-data fallback: "One note mentions heartburn after lunch on 10/10/2026. There aren't enough updates yet to describe a pattern." Never replace this with an unsupported "health looks better/worse" judgement. If a note explicitly says better/worse, attribute it to that dated note.

Generated Summary and editable sharing text remain capped at **1,500 characters**, enforced in Convex. Category highlights stay concise; full measurements/details are one click deeper. Sharing includes the meaningful highlights instead of reverting to counts. Select complete facts within the budget, disclose extra details and retain qualifiers, doses and negative wording. Preserve ownership and stale-source checks.

## Data and verification

Existing records entered during testing are **live data**. Preserve original input, snapshots, dates, capture timestamps, corrections, IDs and ownership. Optional grouping metadata must be backward compatible. Existing label correction requires an explicit, versioned migration scope, retry safety and a recoverable backup; no automatic rewriting of recorded facts. Never put backups or identifiable health data in the repo.

Tests use fictional data and simulated providers. Cover: linked dinner/vomiting across dates; BP with no dizziness; unrelated symptoms at different times; not improving/not dizzy/not sure; heartburn classification; today/yesterday across midnight and zones; approximate clock with exact date; vague/conflicting dates; preserved corrections; invalid grouping fallback; one-off symptoms; repeated symptoms and dated absence; summary limits/staleness; edited saved notes; signed-in empty accounts after deletion; verification handoff; back/draft preservation; mobile copy/share.

Inspect 320, 390, 768 and 1440px, long names/notes, contrast, visible focus, 44px targets and loading/busy/empty/error/retry states. Test in the existing app. After builder confirmation, deploy through npm run deploy and check the HTTPS site at phone width without sending login emails or creating permanent records.

## Review artefacts

Offline HTML and PNG boards in `.impeccable/review/` are design-only, not app routes or a separate testing interface. Health examples are fictional; real screenshots/data are not copied into the repo. Preview controls illustrate placement without saving, signing in or calling providers. Ten mockups were rendered in Edge with no horizontal overflow at 320, 390, 768 and 1440px. This proves layout, not app behaviour.

After approval, update each owning document and build **one milestone at a time**, with app review before publishing.
