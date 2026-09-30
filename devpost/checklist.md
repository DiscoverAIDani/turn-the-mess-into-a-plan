---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn. Keep explanations concise and practical, connect each step to PRD/spec requirements, and wait for the learner's hands-on feedback before committing each slice.

Git initialized with the learner's agreement. Preserve existing course material; stage only reviewed project files. Verify `.env` and `/devpost/learner-profile.md` are ignored and untracked before commits. No real key belongs in `.env.example`.

Current checkpoint: all three approved slices are committed: Slice 1 `15b94e1`, Slice 2 `cbdb06d`, Slice 3 `325fa84`. Slice-specific hands-on approval is recorded below and in the commits. Final whole-app review and the targeted correction are approved. The learning wrap-up remains pending and is outside this commit-only request. The approved 2026-09-29 follow-up covers existing checks, checkpoint-documentation cleanup, an offline app map, and final review only. The learner explicitly authorized the reviewed-file audit and final recovery commit; stop immediately afterward. Preserve Nemotron, the approved targeted prompt/coverage correction, all remaining validators, lifecycle behavior, persistence, UI, and the 15-second upstream timeout.

## Slices

- [x] **1. Turn real notes into a grounded plan on the calm single screen**
  Becomes usable: Paste notes and receive the four result sections from live Nebius inference, or a valid no-action result. The app handles loading and failures without losing the current in-memory result.
  Why now: Proves the distinctive notes-to-plan behavior end to end immediately, including the API and validation risk. Project setup belongs inside this working step.
  PRD ref: `prd.md > Notes and Plan Generation`, `Grounded Prioritization`, `Supported Priority Counts and No-Action Results`, `Generation Failure and Recovery`, `Screens and Layout`, `Look and Feel`, `Approved Defaults`.
  Spec ref: `spec.md > Local Express Server`, `Nebius Request Adapter`, `Schema and Grounding Validation`, `Browser Controller and Rendering`, `Where It Runs and How Someone Tries It`, `Look and Feel`.
  Build: Add the package manifest and lockfile with Express and Ajv only, server and public files from the approved structure, schema and semantic consistency checks, and one /api/plan route. Use configured Nemotron Lightning with thinking disabled for structured output, the 15-second upstream timeout, 20-second browser timeout, 4,096-token cap, and 6,000-character input limit. Show the warm responsive layout, grounded priorities and appointments, no-action message, and controlled manual retry/edit behavior. Provide runnable README instructions. Checklist completion is added in slice 2 and persistence in slice 3; do not imply those behaviors work yet.
  Verify (mechanical): Run Node tests for invalid JSON, refusal, truncation, invalid task references, unsupported excerpts, and no-action consistency. Exercise the route with blank, valid, exactly-6,000-character, and over-limit inputs; invalid input must not call Nebius. Verify controlled provider failure and timeout paths with an injected fake request, and run a live business-example request under the production settings. Open the screen, submit real notes, and inspect goal/priorities/times, one/two/no-action headings, loading and failure recovery, desktop/mobile layout, and keyboard focus. Confirm .env cannot be fetched and no API response includes raw provider output or credentials.
  Learner check: Open http://127.0.0.1:3000, paste the business example, and make a plan. Try a single task and context-only notes. Report whether the screen feels calm and the result makes the next action clear; this early feedback can shape the remaining work.
  Commit: `Complete Slice 1: migrate to Nemotron, enforce grounding validation, and use Your Goal`

- [x] **2. Check tasks off and safely replace a plan**
  Becomes usable: Check and uncheck tasks, edit notes, cancel or confirm regeneration, and see completion reset only after a valid replacement. Failed generation keeps current progress.
  Why now: Adds the usable task interaction and its most important distinction: a no-action result replaces progress while an error preserves it.
  PRD ref: `prd.md > Checklist Completion and Regeneration`, `Supported Priority Counts and No-Action Results`, `Generation Failure and Recovery`.
  Spec ref: `spec.md > Browser Controller and Rendering`, `Data Model`, `The Core Journey Through the System`.
  Build: Add real task checkboxes and completed task IDs, the approved regeneration confirmation, and request identity handling. Keep completion stable during loading and on errors; reset on either a new plan or valid no-action result. Prevent edits and task toggles during generation, keep retries manual, and preserve safe text rendering.
  Verify (mechanical): Run meaningful lifecycle tests for cancellation, confirmed plan replacement, confirmed no-action replacement, rejected/malformed results, and late responses. In the running app check tasks, cancel regeneration, confirm regeneration, and verify failure preserves completion. Confirm no stale plan survives a valid no-action replacement.
  Learner check: Check a task, edit notes, and try both Cancel and Make New Plan. Then regenerate from context-only notes and confirm the old plan disappears. In learn mode, report anything confusing before this step is committed.
  Commit: `Add task completion and confirmed plan replacement`

- [x] **3. Restore current work and clear it safely**
  Becomes usable: Refresh or return to the same local URL and recover notes, result, and completed tasks. Confirm Start Over to clear current and saved work.
  Why now: Preserves the already-working full journey without introducing accounts, history, or extra infrastructure; this completes the approved prototype.
  PRD ref: `prd.md > Local Saving and Start Over`, `States and Boundaries`, `Approved Defaults`.
  Spec ref: `spec.md > Local Persistence`, `Data Model`, `Browser Controller and Rendering`, `Verification During Build`, `Important Failure Modes`.
  Build: Add one versioned localStorage entry and shape validation, saving notes and checkbox changes and replacing saved results only on valid success. Restore no-action results without resurrecting old plans. Implement confirmed clearing, cancellation/invalidation of pending generation, and the calm saving-unavailable notice. Finalize setup and demo instructions and the reusable model-check script from the compatibility investigation.
  Verify (mechanical): Run the full Node test suite. Check save/restore, corrupted saved data, storage exceptions, only-this-app clearing, and stale responses after clear. In the browser refresh after edits and checks, after a no-action replacement, and after confirmed clear. Verify canceled clear preserves work, failed regeneration preserves saved progress, and no temporary dialog/loading/error returns on refresh. Recheck the integrated core journey on desktop and narrow viewport. Inspect intended staged changes for secrets and unrelated work before the commit.
  Learner check: Make a plan, check a task, edit notes, and refresh. Confirm those values survive. Cancel Start Over once, then confirm it and refresh. Explore the complete app with your own messy notes and report anything broken, confusing, or worth refining.
  Commit: `Persist current work and add confirmed start over`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 1; learner reports on usefulness and visual feel before remaining slices.
- [x] Final kick-the-tires exploration and feedback completed — after slice 3; explore the complete journey and awkward inputs.

Learn mode adds the learner check after each slice. Fast mode retains the early and final checkpoints with less code discussion.

## Final Review

- [x] Messy-note correction retried and approved by the learner: coordinated action coverage, context preservation, conditional appointment caveat.
- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Reference map prepared and linked for review; learning activity remains pending until after final feedback. Planned focus: trace the approved distinction between valid no-action replacement and failure preservation from PRD to validation, browser behavior, and a meaningful test.
Route and stops: Reference route in the app map: `public/app.js > generate`, `public/plan-state.js > accept / fail`, and the no-action/failure tests in `tests/result-lifecycle.test.js`. Not toured interactively.
Edit outcome: Not applicable in this review: the learner explicitly requested preservation of the current UI and behavior.
Reflection: Not offered yet; personal answer belongs only in the ignored profile.
Activity mode: Not started.

## Revisions

Historical entries below describe the state when recorded. Later approvals and the current checkpoint supersede earlier commit holds; they are not outstanding instructions.

- Windows PowerShell blocks the npm.ps1 launcher; use npm.cmd commands without changing system policy.
- Browser-control runtime could not start, and a detached command-runner server stopped between tool calls. Added a dependency-free installed-Chrome verification script that runs its own server and saves ignored screenshots; no application dependencies changed.
- Live visual review found flexible weekly work placed ahead of morning appointments. Tightened the model's ordering instruction and added an appointment-before-supplies regression check, preserving the approved prioritization behavior.
- Live testing found that "at most three" allowed a single priority for several supported tasks. Made the PRD's one/two/three rule explicit in the prompt and server validation, with a regression test rejecting undersized priority lists.
- Added a conservative consistency check requiring an uncertainty item when the generated order puts untimed work before an appointment; live output had occasionally omitted the timing caveat despite a valid schema.
- Learner review found invented "today" in the callback goal. Removed implicit daily framing from generation instructions, made goals summarize actions, and added a temporal guard across goal, tasks, and attention. Task timing is checked against its own excerpt; a narrowly defined appointment-order caveat remains allowed. Exact live `Call Maya back.` and deterministic timing/deadline/recurrence regressions pass. No UI change or dependency added.
- Browser verification now uses an ephemeral local port so it can run beside the learner's server without disrupting their work.

- 2026-09-27 resume: approved heading/model changes implemented; added scripts/benchmark-nebius.mjs (10 explicit synthetic live calls). No timeout change: all sampled calls were well below 15 seconds. Prompt clarifications preserve existing product rules, schema, and deterministic grounding guards. Latest benchmark is not fully passing; Slice 1 commit and Slice 2 are withheld under the learner's explicit condition. Existing planning documents remain intact; this revision supersedes their historical model/heading selection.
- Final verification on this resume: all 21 Node tests passed; the full live Chrome regression passed (business, exact callback, curly-apostrophe two-task input, no-action, failure preservation, keyboard focus, and narrow layout). The latest repeated benchmark still had the recorded 1/10 semantic failure, so the all-checks-pass commit condition remains unmet. No files are staged and no commit was created.

- Recurrence investigation: explicitly prohibited unsupported frequency/cadence/scheduling words in the shared temporal instructions, preserving every server validation function. Retained change passed 29/30 live samples, so stability remains unresolved. See `nebius-check/grounding-investigation.md`. Latest user direction supersedes earlier continuation instructions: after any eventual passing Slice 1 checkpoint, stop before Slice 2 for review.
- Final browser regression for the retained recurrence instruction passed: live business, one/two/no-action cases, failure preservation, keyboard focus, and narrow layout. Automated tests: 21/21. Grounding benchmark: 29/30, still failing; no Git checkpoint created and Slice 2 not started.

- Checkpoint acceptance (supersedes earlier commit holds): learner accepts the retained prompt's raw model grounding benchmark of 29/30 as a known model-level limitation. Source "Need to order supplies sometime this week." became unsupported "weekly tasks" in the goal; deterministic validation rejected the response before browser delivery. Application safety behaved correctly; automated regression 21/21 and browser regression passed. Earlier hands-on review confirmed the design and main flows; the learner now explicitly authorizes the Slice 1 checkpoint. No prompt/validation changes in this checkpoint; stop before Slice 2.

- Slice 2 implementation: `public/plan-state.js` holds in-memory result/completion/request identity separately from DOM code for lifecycle testing. Its browser renderability guard prevents malformed responses from replacing progress; authoritative schema/grounding validation remains on the server unchanged. Native labeled checkboxes and a native modal dialog retain the approved warm style. Request attempts retain current work until valid success; no automatic retries or task matching.
- Slice 2 mechanical evidence: `npm.cmd test` passed 28/28. `node --env-file=.env scripts/verify-browser.mjs --lifecycle-only` passed deterministic UI lifecycle checks with no JavaScript exceptions. Full live browser run failed the existing supplies-after-appointments assertion on a generated business result; no provider/prompt/validator changes made and no claim of a fully passing live run. Learner review and Slice 2 commit remain pending.

- Hands-on omission correction: the seven-action business input lost "Post one Facebook update". The old validator checked returned-task evidence only, not source-to-result coverage. Added `server/source-coverage.js` and one validation call to reject uncovered explicit action clauses and clock-led appointments, including false no-action results. Exact source-local excerpts establish coverage; duplicate tasks or a whole-notes excerpt cannot stand in for the missing action. Recognizes common imperative verbs in sentence/newline/semicolon clauses and normalizes trailing punctuation, an urgency suffix, and common request prefixes. This is a conservative guard, not a general semantic completeness proof: unrecognized prose/conjoined actions can escape detection, and shortened or compound excerpts can be rejected even for a complete plan. No result repair, extra model call, provider/prompt/timeout/UI change, or weakening of existing grounding checks.
- Omission verification: five focused tests pass (complete seven-task result, exact six-task omission, each task omitted and replaced by a duplicate, false no-action/context-only behavior, task-text paraphrase, and real API-route safe rejection). Existing validator/temporal/API tests: 21/21 passed. Slice 2 lifecycle implementation is unchanged; learner retry and commit remain pending.
- Omission follow-up browser verification: deterministic lifecycle suite passed, including rejected/malformed result preservation of both plan and checked tasks, cancellation, successful replacement, and no-action replacement. Restart the local Node server to load the new server-side coverage guard before the learner retries the exact seven-task notes. No Slice 2 commit created.

- Slice 2 approval: learner confirmed the seven-task source-coverage case returns all seven tasks, completion state works, failed regeneration preserves existing work, and cancelling regeneration preserves the plan and checks. Hands-on review passed; learner explicitly authorized the staged credential/privacy audit and Slice 2 recovery commit. Stop immediately after committing; Slice 3 remains unstarted.

- Slice 3 approval: learner confirmed persistence across refresh for plan, edited notes, and completed-task state; Cancel Start Over preserves work; confirmed Start Over clears saved work and stays cleared after refresh. Learner explicitly authorized the staged credential/privacy audit and Slice 3 recovery commit. Stop immediately after committing.

- Slice 3 implementation: added `public/storage.js` with shape validation and guarded access to one localStorage entry. `public/app.js` saves on note edits, task toggles, and valid generation success, restores on load, and implements the native confirmed Start Over dialog. `PlanState.clear()` invalidates request identity before aborting; late responses cannot restore cleared results or overwrite newer work. Storage removal failure clears the current visit but explicitly warns that saved work may return; never claims successful deletion.
- Slice 3 verification: `npm.cmd test` passed 40/40; `node --env-file=.env scripts/verify-browser.mjs --lifecycle-only` passed both existing lifecycle and new persistence checks; focused `--persistence-only` follow-up passed refresh during generation without restoring loading. Browser cases cover refresh/return, edited notes with prior checked plan, failure preservation after refresh, no-action restore, Cancel/Escape, confirmed clear, late response after clear and newer generation, unrelated storage preservation, corrupted saved data, quota/read/removal failures, safe current-visit use, and desktop/mobile dialogs. No JavaScript exceptions. Slice-specific hands-on approval was subsequently recorded; Slice 3 is committed at `325fa84`.

- 2026-09-29 final-review verification: existing automated suite passed 40/40; existing deterministic browser lifecycle and persistence checks passed with no JavaScript exceptions, including desktop/mobile cases. Sandbox process restrictions required approved reruns outside the sandbox. No live provider calls or benchmarks rerun. Final whole-app learner review remains pending; no recovery commit authorized yet.

- App map: `devpost/app-map.html` documents source checkpoint `325fa84`; local links and named source anchors verified. Headless Chrome rendered it offline with page scripts disabled at desktop and mobile widths; no overflow, keyboard link access passed, and both screenshots were visually inspected. Map linked to the learner; final review and learning activity are not marked complete.

- Final-review concrete issue: the exact dentist/dog-food/birthday/laundry/email paragraph failed twice with HTTP 200 and schema-valid responses. Temporal validation rejected an inapplicable appointment caveat; source coverage independently treated the whole coordinated paragraph as one required excerpt. One response also changed excerpt capitalization. A controlled grounded fixture isolated the coverage defect.
- Learner authorized a narrow coverage fix, prompt clarification, and regression verification. Coverage now splits recognized coordinated clauses at commas/and while retaining commas inside object lists, names, and timing phrases; recognizes explicit object needs and first-person request prefixes. Each recognized action still needs its own local evidence; whole-paragraph substitution, omitted actions, and altered excerpts remain rejected. Exact-excerpt and temporal validators are unchanged.
- Prompt follow-up: initial clarification was insufficient in live output (false caveat, invented laundry action, lost visible Friday context). Added contrasting mixed-note and actual-appointment examples. The final prompt produced three passing exact messy-note results, two passing seven-task business results, and passing callback/context-only checks. Two intermediate business checks had an em-dash encoding error in the shell diagnostic input; corrected Unicode input passed twice. An earlier prompt candidate omitted appointments and was correctly rejected. These samples do not establish general reliability.
- Final verification after retained changes: 44/44 automated tests passed; deterministic desktop/mobile lifecycle and persistence browser checks passed with no JavaScript exceptions. UI, persistence, lifecycle, model, timeout, temporal validation, and exact-excerpt validation remain unchanged. No staging or commit; stop for the learner to restart the server, retry the exact paragraph and business example, and review.

- Final hands-on approval: learner confirmed the exact messy paragraph produces four actions, preserves Friday/next-week context, keeps laundry as context, and omits the inapplicable appointment caveat. The original business example retains all seven tasks and both 9:00 AM and 11:30 AM appointments. Learner approved the final-review slice and explicitly authorized the reviewed-file credential/privacy audit, selective staging, and final recovery commit. Stop immediately after the commit; no additional work authorized.
