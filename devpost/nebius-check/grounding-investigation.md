# Nemotron recurrence regression investigation

Date: 2026-09-27. Model: `nvidia/Nemotron-3_5-Lightning`. Structured output uses `chat_template_kwargs: { enable_thinking: false }`. Production timeout remains 15 seconds. Only synthetic notes are recorded here.

## Original rejected case

Exact source notes:

```text
Call Maya back about missed estimate — urgent. 9:00 AM carpet cleaning. 11:30 AM upholstery job. Follow up with Jordan. Post one Facebook update. Enter today's payments. Need to order supplies sometime this week.
```

The offending generated field:

```json
{"goal":"Return Maya's call and complete weekly tasks"}
```

Relevant generated task fields were `Enter today's payments` and `Order supplies sometime this week`. Those preserve source timing; the goal incorrectly converts a one-time window into recurrence. The server rejected the entire result through `InvalidPlanError`; none of it became a successful browser result.

## Focused correction and evidence

Expanded only the exported temporal instruction string to explicitly prohibit invented frequency, recurrence, cadence, timing, deadlines, and scheduling. Named daily, weekly, monthly, every, before, after, today, tomorrow and related words; required the same concept to be supported for the action in question. Added the distinction between a time window and recurrence, an action-only goal example, and a final field check. The existing exact ordering-uncertainty caveat remains. No validator function, schema, UI, timeout, model setting, or credential changed in this investigation.

Made benchmark rounds configurable (`BENCHMARK_ROUNDS`, 1–10) and generalized median calculation. Six rounds run all five existing cases: business, one task, two tasks with curly apostrophe, context-only, and a short task padded to the 6,000-character boundary. This boundary case does not simulate dense long notes.

First six-round run with the retained instruction change: **29/30 passed**, median **567 ms**, maximum **2,560 ms**. Business round 2 failed with goal `Return calls, handle appointments, and complete weekly tasks`. Thus the recurrence correction is **not stable** despite five other passing business calls.

A second six-round experiment moved the temporal instructions to the end of the system prompt: **27/30 passed**, median **599.5 ms**, maximum **2,186 ms**. Failures included unsupported weekly recurrence, missing ordering uncertainty, and normalized source punctuation. That placement change was reverted; it is not part of the retained implementation.

Checkpoint acceptance: the learner explicitly accepts the residual model-level limitation and authorizes the Slice 1 recovery commit. The raw model grounding benchmark for the retained prompt is 29/30 on its latest 30-sample run. Application safety behavior passed: unsupported recurrence was correctly rejected before reaching the browser. Automated regression: 21/21 passed. Browser regression: passed. The source "Need to order supplies sometime this week." becoming "weekly tasks" is a known residual model-risk case demonstrating why server-side validation exists. This is not a claim that the raw model is perfectly grounded. The 27/30 placement experiment above was discarded, not the checkpoint configuration. Prompt and validation remain unchanged. Stop after the Slice 1 commit, before Slice 2.
