---
doc: scope
status: approved
---

# Messy Notes to a Clear Next Step

Working title: a simple web app that turns scattered daily tasks into a calm, actionable plan.

## The Unique Kernel
Make the first action obvious without requiring the user to organize their thoughts first: one goal, three priorities, and an ordered checklist that respects fixed appointments. Give a useful first result immediately while clearly separating known blockers, uncertainties, and assumptions.

## Who It's For
The first proof of concept focuses on a small-business owner juggling customer callbacks, scheduled jobs, follow-ups, payments, marketing, and supplies in one messy note. They need to see what to do first and what can wait.

## The Core Loop
Open the app, paste messy notes or describe the day's work, and request a plan. Scan the goal and three priority actions, follow the ordered checklist, and review uncertainties or blockers. Return with another set of notes when work feels overwhelming again.

## Inspiration & Identity
Clean, visual, calm, and easy to scan. The result should feel noticeably less overwhelming than the source notes and make the first, second, and next actions obvious. No reference products or visual sources supplied.

## Why This Matters to the Learner
Practice connecting planning documents to a small, maintainable build through incremental implementation, testing, and understanding generated code. This learning intention guides the workflow without adding product features.

## What "Working" Looks Like
In a one-minute demonstration, paste: "Call Maya back about missed estimate — urgent. 9:00 AM carpet cleaning. 11:30 AM upholstery job. Follow up with Jordan. Post one Facebook update. Enter today's payments. Need to order supplies sometime this week."

Get a useful result quickly enough to go from "I don't know where to start" to "I know what to do first, second, and next" in under a minute. Show one simple daily goal, the three highest-priority actions, a sensible ordered checklist preserving fixed appointment times, and a clearly labeled uncertainty/blocker section without invented facts. Missing contact information must not be asserted merely because it was omitted from the pasted notes.

A small interaction is desirable if time permits. The approved first-build choice is checking off a task. Prepare a short demo video and public GitHub repository; deployment is optional.

## The POC Boundary
- One focused flow from pasted notes to a useful initial plan, without blocking clarification questions.
- One goal, three priority actions, an ordered checklist, and clearly labeled blockers or uncertainties.
- Preserve stated appointments, avoid inventing facts, and label assumptions clearly.
- Focus the demonstration on a small-business owner's daily work; broader messy projects remain the original vision, not a separate required workflow.
- Small interaction: check off tasks in the current plan if time permits.
- Keep the whole experiment sized for the hackathon's 2–4 hours of active work. Detailed behavior belongs in the PRD and implementation choices in the technical spec.

## Prioritization Rules
Use only information actually present in the notes. Keep fixed appointment times fixed, rank explicitly urgent items highly, and order untimed tasks around appointments. Do not invent the current time, task durations, deadlines, or urgency. Label uncertainty when it matters; an ordering suggestion must not imply that an unknown amount of work will fit before an appointment.

## Later
- Answering one short, optional follow-up question after the initial plan. Deferred from the first build; it must never delay the initial result.

## Explicitly Cut
- Accounts and payments: unnecessary to demonstrate notes becoming a useful plan.
- Complicated databases: unnecessary for the proposed first flow and contrary to the learner's simplicity preference.
