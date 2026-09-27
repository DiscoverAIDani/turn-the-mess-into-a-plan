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

Slice 1 provides real plan generation, validated output, responsive results, no-action handling, and manual failure recovery. Slice 2 now adds task completion and confirmed regeneration and has passed hands-on review for its recovery checkpoint. Check tasks in Your Plan; generating with checked tasks asks for confirmation. Cancel preserves work; valid plan or no-action results reset progress; errors preserve it. Browser persistence remains Slice 3, so refreshing currently clears the on-screen work.

The requested Nemotron Lightning switch uses `chat_template_kwargs: { enable_thinking: false }`. Slice 1 is accepted for its recovery checkpoint: the raw model grounding benchmark is 29/30 for the retained prompt, automated regression is 21/21, and browser regression passed. The model converted "this week" into unsupported "weekly" recurrence; server-side validation correctly rejected it before browser delivery. This is an accepted residual model limitation, documented in `devpost/nebius-check/grounding-investigation.md`. Slice 1 is committed at `15b94e1`; Slice 2 is complete and approved for its recovery checkpoint; Slice 3 has not started. The 15-second timeout is unchanged.

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

The local `.env` and learner profile are ignored by Git. Only files inside `public/` are served to browsers. Express and Ajv are the only application dependencies.

Slice 2 verification: `npm.cmd test` passed 28/28. Run `node --env-file=.env scripts/verify-browser.mjs --lifecycle-only` for deterministic completion/regeneration browser tests without model calls. The combined live run also checks model behavior; its latest run exposed supplies placed ahead of appointments. The unchanged grounding validator accepted that result: this is a model ordering-quality limitation, separate from the rejected recurrence case. See the checklist for review status.

The omission follow-up adds conservative server-side coverage for explicit source actions and appointments. Its 5 focused tests and the 21 existing validator/temporal/API tests passed; browser lifecycle checks passed again. Hands-on review confirmed all seven tasks, completion, failed-regeneration preservation, and cancellation preservation.
