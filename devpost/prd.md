---
doc: prd
status: approved
---

# Messy Notes to a Clear Next Step — Product Requirements

Working title carried from scope. A calm, single-screen web app that helps a small-business owner turn scattered daily notes into a manageable plan.

Source: `scope.md > Who It's For`, `The Unique Kernel`.

## The Core Journey
1. Open the app and see a short title, one sentence of guidance, and a large notes field. Restore previously saved work in this browser when available.
2. Paste or type notes, then select **Make My Plan**.
3. Receive a plan without answering preliminary questions. Keep the notes visible and move attention to the results.
4. Read the daily goal, real priorities, ordered checklist, and matters needing attention. Check tasks off as work is completed.
5. Edit notes and generate again when needed. Confirm first if any tasks are checked. A successful plan or valid no-action result replaces the old result and resets completion; a generation failure preserves existing work.
6. Return later to the saved work, or use **Clear / Start Over** and confirm to remove it.

Source: `scope.md > The Core Loop`, `What "Working" Looks Like`. Local saving and clearing were explicitly added by the learner during the PRD interview.

## Screens and Layout
One screen, without a dashboard or complicated navigation. Use the learner's suggested heading **Turn the mess into a plan**, a short explanatory sentence, a large text box with a realistic placeholder example, and the **Make My Plan** button below it.

Keep original notes visible after submission. On wide screens, notes and results can sit side by side; on small screens, stack them vertically. Results use four distinct sections:
- **Today's Goal:** one concise sentence.
- **Top Priority**, **Top 2 Priorities**, or **Top 3 Priorities:** easy-to-scan actions, with the heading matching the supported count.
- **Your Plan:** an ordered checklist with supplied appointment times preserved.
- **Needs Attention:** clearly labeled uncertainties, blockers, missing information, or relevant context.

Source: `scope.md > The POC Boundary`, `Inspiration & Identity`.

## Look and Feel
Calm, warm, organized, friendly, modern, and practical. The visual message is: "You're looking at something manageable now."

Use warm off-white or light cream, muted sage/teal or soft blue-green accents, and dark charcoal text. Cards use subtle tints: blue-green for the goal, pale sage for priorities, neutral cream for the checklist, and restrained amber or peach for Needs Attention. Use readable type, rounded cards, gentle borders or shadows, generous whitespace, and helpful icons sparingly. No exact font was requested.

Avoid stark white as the main background, bright red alerts, neon colors, heavy gradients, dense dashboards, corporate or clinical styling, and visual clutter.

Source: `scope.md > Inspiration & Identity`.

## Features and Behavior

### Notes and Plan Generation
Accept typed or pasted notes, tasks, appointments, reminders, and thoughts. Generate the best supported plan immediately without blocking questions. Preserve the input through every result or failure. Editing notes does not itself regenerate the plan.

Acceptance: the learner's business example produces a goal, three priorities, a checklist, and Needs Attention quickly enough to demonstrate the whole transition in under a minute. This is the demo target, not a guaranteed response-time promise.

Source: `scope.md > The Core Loop`, `What "Working" Looks Like`.

### Grounded Prioritization
Use only information present in the notes. Preserve fixed appointment times, rank explicit urgency highly, and suggest an order for untimed tasks around appointments. Do not invent the current time, durations, deadlines, urgency, or missing facts. Do not imply an untimed task will fit into a specific gap when its duration is unknown. Label assumptions and consequential uncertainty clearly; distinguish confirmed blockers from potentially omitted information.

Acceptance: the example retains 9:00 AM carpet cleaning and 11:30 AM upholstery, treats Maya's callback as explicitly urgent, preserves the supplies task's stated "this week" timing, and does not assert that Jordan's contact details are missing merely because they are absent from the notes.

Source: `scope.md > Prioritization Rules`, `The Unique Kernel`.

### Supported Priority Counts and No-Action Results
Show at most three supported priorities. One real priority uses **Top Priority**, two use **Top 2 Priorities**, and three or more use **Top 3 Priorities**. Fewer priorities is better than invented priorities.

If no clear actionable task exists, do not fabricate a goal or checklist. Show **I couldn't find a clear action in these notes yet.** Keep notes visible and provide one simple action to edit or add detail. Useful non-action information may appear as context or uncertainty in Needs Attention, without becoming an invented action.

A no-action response is a valid new result, not a generation failure. It replaces the old plan in the active results area and saved work, removes old completion state, and retains the updated notes. Do not display or preserve the old plan as a previous version. Any required regeneration confirmation already warned the user that progress could be replaced.

Acceptance: one-task and two-task inputs produce one and two priorities respectively; context-only notes produce the no-action message without invented work. After replacing a checked plan with a no-action result, the old plan and checks are absent both immediately and after refresh.

Source: `scope.md > The Unique Kernel`, `Prioritization Rules`; clarified during the PRD interview.

### Checklist Completion and Regeneration
Allow checklist tasks to be checked off. Regeneration creates a fresh plan with unchecked tasks; do not match tasks across plans.

If one or more tasks are checked, show **Making a new plan will reset your completed tasks. Continue?** with **Cancel** and **Make New Plan**. Cancel retains the current plan and completion states. Confirmation authorizes the attempt; do not discard existing work while waiting. A successful replacement, including a valid no-action response, resets all checkbox states and replaces the saved old result.

Acceptance: cancel preserves checked tasks; successful regeneration resets them; failed regeneration retains them.

Source: `scope.md > The POC Boundary`; checkboxes were made part of the core experience by the learner during the PRD interview.

### Generation Failure and Recovery
Keep notes and any existing plan exactly as they are, including checked tasks. Near the generation button, show a calm inline message:
- With an existing plan: **We couldn't create a new plan. Your current plan is still here.**
- Without a plan: **We couldn't create your plan. Please try again.**

Provide **Try Again** and **Edit Notes**. Do not show technical error codes, alarming red alerts, or repeat retries automatically.

Acceptance: a failed initial attempt preserves input; a failed replacement preserves the prior plan and completion state both on screen and after refresh.

Source: `scope.md > The Core Loop`, `Inspiration & Identity`; recovery behavior supplied during the PRD interview.

### Local Saving and Start Over
Save current notes, the latest successful result (a plan or a valid no-action result), and checked tasks when a plan exists locally in the browser. Refreshing or returning in the same browser restores them. Notes may have been edited since the saved result was generated; editing alone does not replace that result. A valid no-action response replaces the saved old plan and removes its completion state. No accounts, cloud sync, login, or database.

Do not persist error messages, loading states, or confirmation dialogs. **Clear / Start Over** removes notes, the plan, and completion state from the screen and local saved copy only after confirmation. Cancel keeps everything.

Acceptance: edit notes and check a task, refresh, and see both restored alongside the latest plan. Confirm clearing and refresh to verify a clean start. Cancel clearing to verify no change.

Source: `scope.md > The Core Loop`, `Explicitly Cut`; local persistence and clearing explicitly requested during the PRD interview.

## States and Boundaries
- **First use:** guidance, realistic placeholder, notes input, and primary action; no fabricated result.
- **Successful plan:** four result sections with supported priority count and interactive checklist.
- **No actionable tasks:** valid replacement result with a calm message, preserved updated notes, edit option, and optional grounded context; no old plan or completion state remains.
- **Generation failure:** preserve all work and offer manual recovery.
- **Returning:** restore saved work without temporary UI states.
- **Regeneration or clearing confirmation:** cancellation preserves work.
- **Loading and empty input:** follow the approved defaults below.

## Product Decisions
- One screen and one core flow keep the experience manageable.
- Produce a useful first result without blocking clarification.
- Ground every action and timing claim in supplied notes; fewer priorities beat invented ones.
- Retain notes beside results so original context remains available.
- Use warm, quiet visual distinctions instead of alarm styling.
- Reset completion on successful regeneration rather than attempting error-prone task matching.
- Preserve existing work on failures and confirm destructive actions.
- Treat a valid no-action response as the new result, removing the old plan and progress rather than introducing plan-history behavior.
- Save locally for continuity without accounts or cloud infrastructure.
- Review planning documents in Markdown; no extra HTML review files requested.

## What We're Building
The responsive single-screen input-to-plan flow, four grounded result sections, variable priority count, no-action handling, task checkboxes, confirmed regeneration, calm failure recovery, local continuity, and confirmed clearing. Demonstrate the scope's business example in a short video and prepare a public GitHub repository; deployment remains optional.

## Deferred From the POC
- Answering a follow-up question after the plan: keep the first flow focused.
- Plan history, versioning, undo, and automatic task matching: explicitly excluded to avoid confusing carryover and extra complexity.

## Non-Goals
Accounts, login, payments, cloud sync, databases, dashboards, calendar integrations, and complicated navigation. None is necessary to prove this small flow. The app does not invent a detailed schedule from missing timing information or turn contextual facts into unsupported actions.

## Approved Defaults
Approved during PRD review:
- Blank or whitespace-only notes: keep the input and show a short prompt to add notes; do not request a plan.
- While generating: show a calm progress indication, prevent duplicate submissions, and retain all existing work.
- A no-action result when an older plan exists: replace the active and saved result with the no-action response and remove old completion state. Keep updated notes visible; do not preserve a previous plan.
- If there are no grounded attention items, say **No specific blockers identified in these notes.** rather than inventing one.
- If browser saving is unavailable, allow use for the current visit and show a calm notice that work may not survive refresh; do not claim it was saved.

## Open Questions
- No product decisions block technical planning.
- Nonblocking: no final app name has been selected; retain the working document title and the learner's suggested on-screen heading for now.
