# Turn the mess into a plan

A small local web app that turns scattered notes into a goal, up to three priorities, an ordered plan, and grounded matters needing attention.

## Run locally

Node 24 is already installed in the project environment. Install the two application dependencies:

```sh
npm install
```

If `.env` does not already exist, copy `.env.example` to `.env`. Enter your Nebius API key in that local file. Keep the verified `NEBIUS_MODEL=nvidia/Nemotron-3_5-Lightning` setting. Never put keys in browser files or commit `.env`.

```sh
npm start
```

On this Windows machine, use **`npm.cmd install`**, **`npm.cmd start`**, and **`npm.cmd test`** in PowerShell because its execution policy blocks the `npm.ps1` launcher. No policy change is needed. Keep the terminal running while using the app; press Ctrl+C to stop it.

Open **http://127.0.0.1:3000**. Generation sends notes to Nebius and needs internet and usable API credit. The server listens only on this computer. No hosting or deployment is required for the demo.

## Current build checkpoint

All three approved implementation slices are committed and have passed their slice-specific hands-on reviews. Slice 1 provides real plan generation, validated output, responsive results, no-action handling, and manual failure recovery. Slice 2 adds task completion and confirmed regeneration. Cancel preserves work; valid plan or no-action results reset progress; errors preserve it. Slice 3 saves notes, the latest valid result, and checked tasks in this browser across refresh or return to the same URL. Clear / Start Over asks for confirmation before clearing current and saved work. Final whole-app review passed and is approved; the learning wrap-up remains pending.

The requested Nemotron Lightning switch uses `chat_template_kwargs: { enable_thinking: false }`. Slice 1 is accepted for its recovery checkpoint: the raw model grounding benchmark is 29/30 for the retained prompt, automated regression is 21/21, and browser regression passed. The model converted "this week" into unsupported "weekly" recurrence; server-side validation correctly rejected it before browser delivery. This is an accepted residual model limitation, documented in `devpost/nebius-check/grounding-investigation.md`. Slice 1 is committed at `15b94e1`; Slice 2 at `cbdb06d`; Slice 3 at `325fa84`. The 15-second timeout is unchanged.

## Verify

```sh
npm test
```

These tests use synthetic data and simulated requests without an API key or paid calls. Real-model compatibility evidence is in `devpost/nebius-check/`. The selected model was tested for the business example, one and two priorities, and context-only input; this small sample does not guarantee semantic accuracy.

Optional developer browser verification: `node --env-file=.env scripts/verify-browser.mjs` starts an isolated app server on a temporary port and installed Chrome headlessly, runs four small live requests plus simulated failure checks, and saves ignored synthetic test output and screenshots in `.tmp/`. It can run beside your normal app server and consumes a small amount of API credit. Set `BROWSER_EXE` if Chrome is installed elsewhere. This script adds no application dependency.

Explicit latency and semantic benchmark: `node --env-file=.env scripts/benchmark-nebius.mjs` runs ten synthetic requests using production settings and saves a credential-free report in `.tmp/nebius-benchmark.json`. It consumes API credit and exits unsuccessfully if any case fails. Its 6,000-character case pads a short task to verify the input boundary; it does not establish reliability for dense long notes.

Exact live grounding regression: `node --env-file=.env scripts/check-temporal-regression.mjs` submits `Call Maya back.` through the real API route and requires a successful one-task result without added timing. This is one paid/credit-backed request, run only explicitly. Automated `npm.cmd test` also checks that a fabricated "today" response is rejected rather than sent to the browser.

## Limits and behavior

- 6,000 input characters; blank or over-limit notes do not call the model.
- 15-second upstream timeout; 4,096-token output cap; no automatic retries.
- The server rejects malformed, refused, incomplete, or inconsistent model output. Errors leave the current result intact.
- A valid no-action response replaces the old plan. It is not an error.
- Structured JSON and source-excerpt checks reduce errors but do not prove every statement is grounded.
- A conservative temporal guard checks common timing, deadline, duration, recurrence, and urgency language against source evidence, including the goal and attention items. It may reject paraphrases; it is not a general proof of factual correctness.

## Where the plan meets the code

- `devpost/prd.md`: what the app must do.
- `devpost/spec.md`: approved components and data flow.
- `devpost/checklist.md`: verified progress and learner checkpoints.
- `server/plan-schema.js` and `server/validate-plan.js`: grounded response contract and checks.
- `server/nebius.js`: protected provider request.
- `public/app.js` and `public/render.js`: screen behavior and safe text rendering.
- `public/storage.js`: one versioned browser-local saved entry and restore validation.

The local `.env` and learner profile are ignored by Git. Only files inside `public/` are served to browsers. Express and Ajv are the only application dependencies.

Slice 2 verification: `npm.cmd test` passed 28/28. Run `node --env-file=.env scripts/verify-browser.mjs --lifecycle-only` for deterministic completion/regeneration browser tests without model calls. The combined live run also checks model behavior; its latest run exposed supplies placed ahead of appointments. The unchanged grounding validator accepted that result: this is a model ordering-quality limitation, separate from the rejected recurrence case. See the checklist for review status.

The omission follow-up adds conservative server-side coverage for explicit source actions and appointments. Its 5 focused tests and the 21 existing validator/temporal/API tests passed; browser lifecycle checks passed again. Hands-on review confirmed all seven tasks, completion, failed-regeneration preservation, and cancellation preservation.

Slice 3 verification: the full automated suite passed 40/40. `node --env-file=.env scripts/verify-browser.mjs --lifecycle-only` runs deterministic completion/regeneration and persistence checks without model calls; `--persistence-only` selects just persistence/reset cases. Both passed. Current browser saving is local to the same browser profile and exact origin (`http://127.0.0.1:3000`); switching hostnames or ports uses a different saved entry. If saving is unavailable, the screen stays usable and explains that current changes may not survive refresh.

Hands-on Slice 3 check: make a plan, check a task, edit the notes, and refresh or leave and return to the same URL. Confirm the notes, plan, and checks return. Cancel Start Over once, then confirm it and refresh; the screen should remain empty. A valid no-action replacement should also survive refresh without restoring an old plan.

## Final review and demo walkthrough

The 2026-09-29 review reran the existing automated suite (40/40 passed) and deterministic browser lifecycle/persistence checks (passed, no JavaScript exceptions). No live benchmark was rerun; the documented model limitations remain. Final whole-app learner feedback is resolved and approved; the learning wrap-up remains pending. Open [the offline app map](devpost/app-map.html) for the code route and reusable verification practice.

For the short demo, start the app at the documented URL and paste this synthetic business example:

```text
Call Maya back about missed estimate — urgent.
9:00 AM carpet cleaning.
11:30 AM upholstery job.
Follow up with Jordan.
Post one Facebook update.
Enter today’s payments.
Need to order supplies sometime this week.
```

Show the notes becoming the four result sections, inspect all seven supported tasks and supplied timing, then check a task. The target is to demonstrate the transition in under a minute, not a guaranteed provider response time. For final review, also edit notes and refresh, cancel regeneration, confirm a context-only replacement, and cancel then confirm Start Over. Try blank input and a narrow window. Report any unexpected behavior before calling the build ready. Use synthetic notes for the recording.

Final-review correction (hands-on approved): coordinated messy notes now use separate recognized action clauses for coverage instead of requiring a whole-paragraph excerpt. Prompt examples distinguish descriptive context from stated actions and make the fixed-appointment caveat conditional. Exact-excerpt and temporal checks remain intact. Final checks passed 44/44 automated tests plus deterministic browser lifecycle/persistence checks. Small live checks passed the exact reported paragraph three times, the seven-task business example twice, and callback/context-only cases; this is sample evidence, not a reliability guarantee. Restart the Node server before retrying to load the changed server code.

Final hands-on review passed for both the exact messy-note paragraph and the original seven-task business example, including supplied timing, descriptive context, and appointment preservation. The learner approved the final recovery commit.
