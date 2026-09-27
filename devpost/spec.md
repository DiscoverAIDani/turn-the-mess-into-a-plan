---
doc: spec
status: approved
---

# Messy Notes to a Clear Next Step — Technical Spec

Approved technical blueprint. Account-specific schema tests support `openai/gpt-oss-120b` for the prototype. The learner approved the architecture and limits, changing the upstream timeout to 15 seconds. Model quality remains bounded by the small test sample.

## Slice 1 Recovery Checkpoint Update

This approved implementation update supersedes the historical model selection below without reopening the blueprint. Selected model: `nvidia/Nemotron-3_5-Lightning`; structured requests use `chat_template_kwargs: { enable_thinking: false }`. UI heading: **Your Goal**. Existing schema and deterministic grounding validation remain intact; upstream timeout remains 15 seconds.

- Raw model grounding benchmark: **29/30** on the latest 30-sample run of the retained prompt.
- Application safety behavior: unsupported recurrence was correctly rejected before reaching the browser.
- Automated regression: **21/21 passed**.
- Browser regression: **passed**.

Known residual model-risk example: source `Need to order supplies sometime this week.` produced the goal `Return calls, handle appointments, and complete weekly tasks`. A one-time window does not establish weekly recurrence. The server rejected this response; the case demonstrates why validation exists even with explicit grounding instructions. The learner accepts this documented model limitation for Slice 1. See `nebius-check/grounding-investigation.md` for exact original notes and experimental history. No prompt or validation weakening is authorized. Stop after the Slice 1 recovery commit, before Slice 2.

## How This Works, In Plain Language
The browser shows the notes and plan and remembers current work on this computer. A small Node.js program runs locally and serves the screen. When the user requests a plan, this program sends the notes to Nebius using a secret key that never goes to the browser. It checks the returned data before sending an accepted result to the screen.

A valid result can be a plan or a message that no actionable tasks were found. Either replaces the previous result. A broken response or failed request leaves existing work intact. This distinction implements the learner's PRD correction directly.

## The Core Journey Through the System
Implements `prd.md > The Core Journey`.
1. Open the local URL. Browser code restores the saved notes, result, and completed task IDs.
2. Editing notes saves the current text locally but does not regenerate.
3. Submission checks nonblank input and asks for confirmation if tasks are checked. Cancellation changes nothing.
4. Browser posts a snapshot of the notes to `/api/plan`. Keep existing work during loading and prevent duplicate submissions.
5. The server validates input, supplies grounding instructions and a JSON schema to Nebius, and validates the completed response.
6. On success, the browser replaces the result, clears old completion IDs, and saves. A no-action result clears the old plan just as a new plan does.
7. On failure, the browser leaves notes, result, completion, and saved result intact and displays the PRD's recovery actions.
8. Confirmed clearing removes only this app's saved entry and resets the screen. Pending responses must not restore cleared work.

## Stack
- Node.js: installed **v24.21.0**, verified locally. Do not reinstall. Use ES modules, built-in `fetch`, `.env` support, and the built-in test runner. [Node documentation](https://nodejs.org/docs/latest-v24.x/api/).
- Express **5.2.1** (locked during build): agreed lightweight server and one application API endpoint, with only the `public/` directory served to browsers. [Express](https://expressjs.com/en/starter/installing/).
- Plain HTML, CSS, and JavaScript modules: agreed frontend; no framework, bundler, or separate frontend development server.
- Ajv **8.20.0** (locked during build): approved validation dependency for checking the same JSON schema sent to the model, avoiding a separate handwritten schema validator in the product. [Ajv](https://ajv.js.org/guide/getting-started.html).
- Browser localStorage: agreed persistence for one current result, with no database. [Browser storage documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
- Nebius Token Factory: agreed provider; select `openai/gpt-oss-120b` following the account-specific investigation below. Read its exact ID from `NEBIUS_MODEL`, with no silent fallback. No AI SDK required. [Nebius quickstart](https://docs.tokenfactory.nebius.com/quickstart).

## Where It Runs and How Someone Tries It
Run on this Windows computer using its installed Node. Build will supply `npm install`, then `npm start` (defined as `node --env-file=.env server/index.js`). Open **http://127.0.0.1:3000** consistently so browser storage uses the same origin. Bind the server to loopback for the local prototype.

Build environment note: PowerShell blocks `npm.ps1` here; use `npm.cmd install`, `npm.cmd start`, and `npm.cmd test`. The app and dependencies are unchanged and no execution-policy change is needed.

The local `.env` contains `NEBIUS_API_KEY`, `NEBIUS_MODEL=openai/gpt-oss-120b`, and `PORT=3000`. `.env.example` has a blank credential value and the verified model ID. Existing ignore rules exclude `.env` and `.env.*` while allowing `.env.example`. Never log keys or place credentials in public assets, API responses, tests, or committed files.

The demo runs locally but requires internet and usable Nebius credits for new generation. Saved results and checkbox interaction remain browser-local. Submissions require a short demo video and a public GitHub repository. Deployment is optional and no hosting platform is selected.

## Look and Feel
Implements `prd.md > Look and Feel` and `Screens and Layout`.
Use CSS custom properties for warm cream, muted teal/sage, charcoal, and restrained amber/peach. Use readable system fonts, generous spacing, gentle borders, rounded cards, and subtle section tints. Use a two-column layout when space allows and one column on small screens. Keep notes visible while bringing successful results into view. Use semantic headings, labels, real checkboxes, visible keyboard focus, and adequate contrast. Avoid external fonts, icon libraries, heavy gradients, and alarming error styling.

## Components

### Local Express Server
Implements `prd.md > Notes and Plan Generation` and `Generation Failure and Recovery`.
`server/index.js` serves only `public/` and mounts `POST /api/plan`. It does not serve the project root or `.env`. Apply a 32 KB JSON body limit and the approved 6,000-character notes limit, check input type and nonblank content, set no-store on API responses, and return a small stable error object instead of raw provider errors. The browser shows the same length limit and retains over-limit input with a calm edit prompt. This limit is a prototype cost/output bound, not a provider limit. No permissive cross-origin access is needed for the same-origin local app.

### Nebius Request Adapter
Implements `prd.md > Grounded Prioritization` and `Supported Priority Counts and No-Action Results`.
`server/nebius.js` reads the key and selected model from environment settings and makes one nonstreaming request. No model fallback is silently selected and no automatic repeated retries are made. Use the tested `max_tokens: 4096` and the learner's approved **15-second upstream timeout**. Use the provider's default sampling parameters as tested. Browser timeout is 20 seconds so the server can return its controlled timeout error first. Missing configuration gives a controlled generation error. Earlier compatibility tests used a 45-second ceiling; observed selected-model calls finished below 5 seconds. Build verification must check the new timeout's failure path; future provider delays may still exceed it.

### Schema and Grounding Validation
Implements `prd.md > Grounded Prioritization`, `Supported Priority Counts and No-Action Results`, and `Generation Failure and Recovery`.
`server/plan-schema.js` defines one response schema; `server/validate-plan.js` checks it with Ajv plus consistency checks. All objects reject unexpected fields. Reject refusal, truncation, missing content, malformed JSON, schema violations, duplicate task IDs, and priorities referencing nonexistent tasks.

When the generated order puts untimed work before an appointment, require an uncertainty item as a conservative consistency guard. The prompt explains that the suggested order does not establish whether it fits before the appointment. A context label alone is insufficient.

`server/temporal-grounding.js` additionally checks common relative dates, clock times, dayparts, deadlines/order relations, durations, recurrence, and urgency in generated goals, task text, and attention. Task claims are compared to that task's exact source excerpt; goal and attention claims are compared to the notes. Reject unsupported claims through the same generation-failure path. Do not repair or show the raw rejected result. Remove implicit "daily" framing from the generation instructions; goals summarize actions while supplied timing remains on relevant tasks. The original UI design and headings are unchanged.

One exact uncertainty sentence is allowed for mixed timed/untimed tasks: `Suggested order only: whether untimed work fits before fixed appointments is unknown.` It describes uncertain fit and does not assert a deadline. There is no general exemption for assumptions or uncertainties. This deterministic guard is conservative: it can reject temporal paraphrases and does not prove arbitrary natural-language semantics. The regression specifically rejects "Return Maya's call today" for `Call Maya back.` and prevents borrowing "today" from a separate payment task.

The prompt treats pasted notes as data rather than instructions, preserves stated facts and times, and never supplies the computer's current time to fill missing information. Apply grounding to the goal and attention text, preserve broad timing such as "this week" visibly in task text, and explicitly require a timing uncertainty when suggesting untimed work around appointments. Use the tested instructions plus grounding clarification in `nebius-check/check.mjs` as the starting point. Require exact source excerpts for task support. Validate excerpts occur in the submitted notes and appointment strings occur in their task evidence. This is a useful guard, not a proof that all language is factually grounded; semantic examples are tested separately.

### Browser Controller and Rendering
Implements `prd.md > Notes and Plan Generation`, `Checklist Completion and Regeneration`, `Generation Failure and Recovery`, and `Approved Defaults`.
`public/app.js` coordinates current work and temporary UI state. Slice 2 extracts in-memory result, completed task IDs, and request identity into `public/plan-state.js` so replacement/failure/late-response behavior can be tested independently. A browser renderability guard rejects malformed API payloads before replacing current work; it does not replace server-side schema or grounding validation. `public/render.js` renders result text using safe text nodes, never model-supplied HTML. Derive the priority heading from the count. A valid no-action result renders only the no-action message, Edit Notes, and any supported attention context; old plan cards and checked tasks disappear.

Generation snapshots the submitted notes. As a derived race-prevention detail, lock edits and task toggles during the request; clear can cancel/invalidate the request after confirmation. Use a request identity so late responses cannot restore cleared work. Focus Edit Notes back into the input. Temporary messages and dialogs are not saved.

### Local Persistence
Implements `prd.md > Local Saving and Start Over`.
`public/storage.js` reads/writes one versioned app entry, `messy-plan:v1`. Save edited notes and checkbox changes; replace the result only on valid successful responses. Store no credentials. Validate restored shape; malformed stored data must not crash the screen or be treated as a valid plan. Storage failures use the approved calm notice and leave the current visit usable. Clear removes this entry only, not all browser storage.

## Data Model
Approved concrete contract derived from the product behavior:

```text
Result {
  kind: "plan" | "no_actions",
  goal: string,                     // empty for no_actions
  tasks: [{ id, text, appointmentTime, sourceExcerpt }],
  priorityTaskIds: string[],        // ordered, at most 3, refers to tasks
  attention: [{ kind, text }]       // blocker | uncertainty | context | assumption
}
```

Task order is checklist order. `appointmentTime` is a supplied time string or null, never an inferred time. `sourceExcerpt` is an internal validation field, not extra UI clutter. `no_actions` requires an empty goal, no tasks, and no priorities; attention may contain grounded context. A plan requires a nonblank goal, at least one supported task, and exactly `min(3, tasks.length)` unique supported priority IDs, implementing the PRD's one/two/three priority rule. The server checks consistency beyond simple field types.

Browser saved data: `{ version: 1, notes, result: Result | null, completedTaskIds: [] }`. Completion IDs must belong to the current result. Any valid replacement starts with an empty completion list. No-action results are saved so the old plan does not return after refresh.

Temporary data: loading flag, current error, confirmation intent, and active request identity; memory only. The server holds submitted notes only for the request and does not create a notes database or application history.

## File Structure
Planned product files (not yet built):

```text
project/
  public/
    index.html              # Single screen and confirmation UI
    styles.css              # Responsive warm visual design
    app.js                  # User actions and request lifecycle
    plan-state.js           # In-memory completion and safe result replacement
    render.js               # Safe result rendering
    storage.js              # Browser-local save/restore/clear
  server/
    index.js                # Express startup and /api/plan route
    nebius.js               # One provider request, secret stays here
    plan-schema.js          # Schema and grounding instructions
    validate-plan.js        # Schema and consistency checks
    temporal-grounding.js   # Source checks for temporal claims
  tests/
    plan-validation.test.js # Bad output and no-action rules
    temporal-grounding.test.js # Exact callback and temporal-evidence regressions
    result-lifecycle.test.js# Replacement versus failure preservation
  scripts/
    check-nebius.mjs        # Account lookup and explicit model smoke test
    verify-browser.mjs     # Dependency-free installed-Chrome verification
    check-temporal-regression.mjs # Explicit live callback regression
  devpost/
    scope.md                # Approved scope
    prd.md                  # Approved behavior
    spec.md                 # Approved technical blueprint
    nebius-check/           # Small pre-build compatibility investigation
  .env                      # Local secret; ignored
  .env.example              # Blank key and verified model ID
  .gitignore
  .tmp/                     # Ignored verification screenshots
  package.json              # Start/test commands and dependencies
  package-lock.json         # Reproducible dependency versions
  README.md                 # Local setup and demo instructions
```

Course-provided folders remain in place. The pre-build investigation can inform the final script but is not the application implementation.

## External Services and Dependencies
Nebius base URL: `https://api.tokenfactory.nebius.com/v1/`.
- Discovery: `GET /models` with `Authorization: Bearer <key>`. Model listing alone is not proof of inference access, schema support, or credit eligibility.
- Generation: `POST /chat/completions` with bearer authentication and JSON containing configured `model`, grounding system message, user notes, `stream: false`, an output limit, and `response_format: { type: "json_schema", json_schema: { name: "daily_plan", strict: true, schema: ... } }`.
- Expected envelope: `choices[0].message.content` containing the JSON result, with a successful completion reason. Check refusal and truncation before parsing. Return only validated data to the browser.
- App endpoint: `POST /api/plan` accepts `{ notes: string }`; returns `{ result: Result }` on success or a stable error code on failure. Browser chooses the approved friendly wording based on existing work. Invalid model output never becomes a no-action result.

[Structured output contract](https://docs.tokenfactory.nebius.com/ai-models-inference/json), [rate limits](https://docs.tokenfactory.nebius.com/ai-models-inference/rate-limits), [billing](https://docs.tokenfactory.nebius.com/other-capabilities/billing-new), [account pricing](https://tokenfactory.nebius.com/organization/prices).

Selected model: `openai/gpt-oss-120b`, verified in the account catalog and through successful inference. Published base rates found in Nebius's indexed pricing page: $0.15/million input tokens and $0.60/million output tokens. Qwen's published comparison rates are $0.10/$0.30. The indexed price table was crawled five months earlier and the live page redirects to the account console; therefore these are planning estimates, not a verified account invoice or guaranteed current rate. [Pricing source](https://nebius.com/token-factory/prices). The learner's credit balance, expiration, and exact billing eligibility remain unverified; successful calls establish inference access only.

No Tavily, search API, other AI provider, database, or hosting service. No concurrent generation is needed for this single-user local demo. Exact account rate limits are unknown; HTTP 429 follows the controlled failure path with manual retry.

## Model Compatibility Investigation
Completed on 2026-09-26 Pacific (reports use 2026-09-27 UTC):
1. Learner enters the key locally; never request it in chat or print it.
2. Query available model IDs. Start with `openai/gpt-oss-120b` only if present. Inspect account pricing and JSON/schema capability information to identify a lower-cost suitable candidate when available.
3. Send a small shared-schema test set: the business appointment example, one task, two tasks, and context-only notes. Test a limited number of candidates, not the whole catalog.
4. Check JSON schema compliance, result consistency, correct priority counts, preserved appointment times, no invented contact blocker, and valid no-action behavior. Record latency and provider-reported token usage without credentials or account identifiers.
5. Prefer the simpler/lower-cost candidate that passes. Record exact ID, request parameters, rates/source, results, and limitations. A small passing sample establishes compatibility, not universal reliability.

### Observed Results and Selection
Both model IDs were returned by authenticated account discovery. Ran four cases per model with initial instructions, then four per model with clarified grounding instructions: **16 inference requests total**. All 16 passed the structural checks, but initial semantic review found invented urgency in Qwen's two-task goal and insufficient appointment-order uncertainty in both models. The revised test added checks for weekly timing, timing uncertainty, and the word urgent without source support.

With revised instructions, both passed all four structural/targeted checks. Manual review found Qwen still used "immediate follow-ups" without supplied urgency and its business uncertainty listed later untimed tasks but omitted the callback placed first. GPT-OSS did not introduce urgency in the two-task example, preserved weekly timing, kept appointments, and gave a timing-order uncertainty. Select GPT-OSS for better observed grounding rather than selecting the cheaper Qwen solely on JSON validity.

| Candidate | Revised case latencies | Revised input/output tokens | Estimated revised-set cost |
| --- | --- | --- | --- |
| Qwen/Qwen3-30B-A3B-Instruct-2507 | 13.398 / 3.525 / 4.236 / 2.559 s | 1,971 / 818 | $0.000443 |
| openai/gpt-oss-120b | 4.706 / 1.691 / 2.452 / 2.169 s | 2,223 / 2,289 | $0.001707 |

Cost estimates use published base rates without cached-input discounts, not billed charges. Across both rounds/models, the same calculation gives about **$0.0041** total. Actual credits consumed must be checked in the console. The revised GPT-OSS business example is approximately $0.00076 under those rates.

Evidence: `nebius-check/result-v2-openai_gpt-oss-120b.json`, `nebius-check/result-v2-Qwen_Qwen3-30B-A3B-Instruct-2507.json`, original `result-*.json`, and `nebius-check/check.mjs`. Reports contain only synthetic sample results and usage, not keys. This is a small compatibility investigation, not a reliability benchmark; keep regression examples and server validation in the build.

## Verification During Build
Tie tests to PRD requirements, not implementation details. Unit-check malformed/truncated/refused outputs, inconsistent priority references, fabricated source excerpts, and the no-action contract. Exercise UI lifecycle: canceled regeneration, successful replacement, no-action replacement, failure preservation, clear during a pending request, refresh restoration, and unavailable storage. Manually inspect desktop/mobile layout and keyboard behavior. Record the one-minute business example using real inference.

## Important Failure Modes
- Nebius network, authorization, rate-limit, timeout, refusal, or invalid response: keep current work and offer the PRD's manual recovery; no raw output or repeated retries.
- Valid no-action response: replace and save the new result, clearing old progress; this is success.
- Local saving unavailable: keep current work usable and show the approved persistence notice.

## What Was Simplified and Why
One same-origin server, one request endpoint, plain browser modules, and one saved result. No cloud hosting requirement, framework build pipeline, accounts, history, automatic task matching, streaming, or search. Use the installed Node runtime. Keep the model configurable but do not add a provider abstraction or model picker.

## Decisions and Open Issues
Learner-approved: Node + Express, plain frontend, browser local storage, Nebius, protected local key, server-side output validation, no Node reinstall, and local demo with optional deployment.

Learner uncertainty: which available low-cost model reliably follows the needed schema. The agreed investigation above resolves it with account evidence and real calls before selecting a model. This also illustrates how `prd.md > Supported Priority Counts and No-Action Results` becomes a data contract and a test.

Approved implementation choices: Ajv validation dependency, result fields, file boundaries, and request race handling. Product behavior stays governed by the approved PRD.

Account access and model/schema compatibility are verified. The learner approved the complete blueprint, GPT-OSS selection, Ajv, the 6,000-character input bound, 4,096-token output cap, and a 15-second upstream timeout. No technical decision blocks build planning. Exact account charges and credit terms are not independently verified and must not be represented as confirmed.

Nonblocking: final app name remains a working title. Exact package versions will be pinned in the build lockfile. The input bound needs a boundary case during build; current model tests used small realistic notes and do not establish long-input reliability.
