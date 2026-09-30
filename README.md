# Turn the mess into a plan

A small AI-assisted planning app that turns scattered notes into a clear goal, up to three priorities, an actionable checklist, and grounded context or uncertainty.

Built with **NVIDIA Nemotron 3.5 Lightning** through **Nebius Token Factory**.

## Why I built it

People rarely write perfect task lists.

Real notes look more like:

> Need to call the dentist, pick up dog food, Mom’s birthday is Friday and I still need a gift, laundry is piling up, and I should email Sarah about lunch next week.

The goal of this project is to turn that kind of messy input into something useful **without quietly inventing, dropping, or changing what the user actually said**.

## What it does

The app turns unstructured notes into four simple areas:

- **Your Goal** — a concise summary of what needs to get done
- **Top 3 Priorities** — the most important actions to focus on first
- **Your Plan** — a checkable task list
- **Needs Attention** — context, uncertainty, or timing information that should not become a task

Completed tasks can be checked off, and notes, the latest valid plan, and completion state persist across browser refreshes.

Users can safely regenerate a plan or use **Clear / Start Over** to reset saved work.

## How it works

```text
Messy notes
    ↓
Nebius Token Factory
    ↓
NVIDIA Nemotron 3.5 Lightning
    ↓
Structured JSON
    ↓
Server-side grounding and consistency validation
    ↓
Plan shown to the user
```

The model response is **not automatically trusted**.

Before a plan reaches the browser, the server checks:

- structured response shape
- source-action coverage
- exact source excerpts
- supplied appointment timing
- unsupported deadlines, recurrence, duration, and urgency
- malformed or incomplete results
- context that should not be converted into an action

If validation fails, the generated result is rejected rather than silently shown to the user.

## Example

Input:

```text
Call Maya back about missed estimate — urgent.
9:00 AM carpet cleaning.
11:30 AM upholstery job.
Follow up with Jordan.
Post one Facebook update.
Enter today’s payments.
Need to order supplies sometime this week.
```

The app preserves all seven supported actions, keeps the supplied appointment times intact, and separates uncertainty from the task list.

A more natural messy-note example:

```text
Need to call the dentist, pick up dog food, Mom’s birthday is Friday and I still need a gift, laundry is piling up, and I should email Sarah about lunch next week.
```

The app produces actions for:

- calling the dentist
- picking up dog food
- getting Mom a gift
- emailing Sarah

while keeping **“laundry is piling up”** as context instead of inventing a laundry task.

## Grounding and safety

During testing, Nemotron once omitted one of seven explicit source tasks.

Instead of fixing only that example, the app gained a deterministic **source-action coverage guard** so incomplete plans can be rejected before reaching the user.

Final QA also uncovered a validator issue with natural notes containing several actions separated by commas and conjunctions. The coverage logic was updated so each recognized action can use its own source evidence without weakening omission protection.

The app still deliberately rejects:

- unsupported timing
- fabricated recurrence
- changed source excerpts
- missing explicit actions
- descriptive context converted into an unstated task

These safeguards reduce model mistakes, but they do not prove that every model interpretation is semantically perfect.

## Built with

- **NVIDIA Nemotron 3.5 Lightning**
- **Nebius Token Factory**
- Node.js
- Express
- Ajv
- Vanilla HTML, CSS, and JavaScript

The selected model is:

```text
nvidia/Nemotron-3_5-Lightning
```

Structured generation uses:

```js
chat_template_kwargs: { enable_thinking: false }
```

## Run locally

### 1. Install dependencies

```sh
npm install
```

On Windows, if PowerShell blocks the `npm.ps1` launcher, use:

```sh
npm.cmd install
```

### 2. Configure Nebius

Copy `.env.example` to a local `.env` file.

Add your Nebius API key and keep:

```text
NEBIUS_MODEL=nvidia/Nemotron-3_5-Lightning
```

Never commit `.env`.

### 3. Start the app

```sh
npm start
```

On Windows:

```sh
npm.cmd start
```

Then open:

```text
http://127.0.0.1:3000
```

Generation requires internet access and usable Nebius API credit.

## Verification

Run the automated test suite with:

```sh
npm test
```

or on Windows:

```sh
npm.cmd test
```

Current final verification:

- **44/44 automated tests passed**
- deterministic browser lifecycle checks passed
- persistence/reset browser checks passed
- desktop and narrow/mobile hands-on review passed
- live checks passed for the seven-task business example
- live checks passed for the natural messy-note example
- callback and context-only cases passed

The live checks are small samples and are not a guarantee of model reliability.

## Key behavior

- 6,000-character input limit
- blank or oversized input does not call the model
- 15-second upstream timeout
- no automatic retries
- failed generations preserve the current valid plan
- valid no-action results can replace an old plan
- completed tasks persist in the same browser
- saved state is local to the same browser profile and origin
- Clear / Start Over requires confirmation

## Known limitations

LLM output remains probabilistic.

The model can still make ordering-quality decisions that are not ideal even when the result is grounded.

The validators are intentionally conservative and may reject some valid paraphrases.

Browser persistence is local only. Switching browser profiles, hostnames, or ports creates a separate saved state.

The app currently runs locally and requires a Nebius API key.

## Project documentation

More detailed development and verification material is available here:

- [`devpost/prd.md`](devpost/prd.md) — product requirements
- [`devpost/spec.md`](devpost/spec.md) — architecture and data flow
- [`devpost/checklist.md`](devpost/checklist.md) — implementation and verification record
- [`devpost/app-map.html`](devpost/app-map.html) — visual application/code map
- [`devpost/nebius-check/`](devpost/nebius-check/) — Nemotron compatibility and grounding investigation

## Privacy

The Nebius API key stays in the local `.env` file and is never sent to the browser.

`.env` is excluded from Git.

Only files in `public/` are served to the browser.