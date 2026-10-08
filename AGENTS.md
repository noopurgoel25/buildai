# AGENTS.md

How we work on CareNama. Product rules live in PRODUCT.md, screens in DESIGN.md, technical rules in ARCHITECTURE.md.

## 1. Read first

| Before… | Read |
|---|---|
| Any task | PRODUCT.md, PLAN.md, PROGRESS.md |
| Screen work | DESIGN.md |
| Backend, AI, data, limits, tracking | ARCHITECTURE.md |
| Questioning an existing rule | DECISIONS.md (why it was decided) |
| Anything beyond the current version | ROADMAP.md |

IDEA_SCOPE.md and `archive/` are history only. Never build from them.

## 2. How we work

- Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.
- One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.
- If I ask for something new mid-milestone, add it to the right version in ROADMAP.md and carry on.
- If a product decision, interaction or requirement is unclear or conflicts with PRODUCT.md, DESIGN.md or ARCHITECTURE.md, stop and ask.
- When I report a bug, I'll name the part. Look there first and tell me if you think I named the wrong one. Find the cause before changing anything. Fix only that.
- When we add something, write tests so what already works doesn't break. When I drop a feature, drop its tests.
- Never say "done" until you've seen it work (a test, or a screenshot at phone width) and told me how to check it on my phone.
- Build and test only in the mobile-first web app. No separate test page or alternate interface.

## 3. Keeping the docs current

Each topic lives in exactly one file. When something changes:

1. Update the one file that owns the topic (current state only, no dated addenda).
2. Add a dated entry to DECISIONS.md saying what changed and why.
3. After I confirm a milestone works: add one line to PROGRESS.md.

Never append "Approved … (date)" paragraphs to PRODUCT.md, DESIGN.md or PLAN.md.

## 4. Shipping

- Live link: https://aware-starfish-233.convex.site
- Repo: github.com/noopurgoel25/buildai (public)
- Deploy: `npm run deploy`. A push never deploys by itself.
- After I confirm a milestone: commit, push, deploy, then verify the live site at phone width with a fictional update. Don't send login emails or create permanent records during live checks.
- Publishing before confirmation is allowed only when I explicitly approve it for phone testing (voice and native sharing need the HTTPS site).
- Local preview: `npm run dev -- --host 0.0.0.0`; desktop http://localhost:5173, phone on the same Wi-Fi via the computer's LAN address. HTTP preview supports text and copying only.
- If the agent session can't reach npm, Convex or git (EACCES / read-only), stop and give me the exact commands to run in my terminal.
- Before I share the link publicly: I open it on my phone, logged out, on mobile data, and do the core flow once.

## 5. Keys and data

- Keys live only in Convex environment variables (dev and prod). See ARCHITECTURE.md §9 for the list.
- Never put a key or password in code, a `VITE_` variable (sent to every visitor) or a committed file. `.gitignore` covers `.env.local`.
- Never ask me to paste a key into chat. Give me the dashboard step or a script that sends it straight to Convex.
- Real people's data (health information, names, emails, phone numbers or anything identifying) never goes in the repo, not even as a test file. Tests use made-up examples.
- Every limit and every "is this allowed" check happens in a Convex function, never only on screen.

## 6. Tests

- Default `npm test`: unit/server and browser tests with simulated providers and accounts.
- Live-provider tests (real Sarvam) are optional and skipped by default; run them on purpose. They spend credits and count toward the shared AI limit.
- Check layouts at 320, 390, 768 and 1440 px; no horizontal overflow; keyboard focus visible.
