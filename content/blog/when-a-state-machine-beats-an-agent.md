---
title: "When a state machine beats an agent"
description: "Two multi-step AI systems, two shapes: a step-level run engine for job applications and an open-ended agent for recruiting. How I decide which one a problem needs."
date: "2026-11-08"
id: 21
tags: ["AI agents", "Product engineering", "Node.js"]
---

This year I built two systems that both do multi-step work with models in the loop, and they are shaped completely differently.

GoodSpace Autopilot applies to jobs for a member. It runs on a step-level state machine: every application is a run, every run has the same steps, and each step is one queue job. The Mandate Assistant runs a recruiting mandate. It is an open-ended agent with 42 tools that decides what to do next from the conversation and the state of the mandate.

Neither design is better in general. Each fits its problem, and the reasons are worth spelling out, because "should this be an agent?" is now a question I ask before writing any code.

## Autopilot: the same steps every time

An application always goes through the same sequence: track the job, scan it against the ATS, find a hiring contact, tailor the resume, write a cover letter, draft the email, send it. The order is known. The inputs to each step are known. What varies is the content, not the plan.

That is a workflow, and it runs better as one:

- **One queue job per step.** Each step can be retried, timed and measured on its own. If cover letters get slow, that shows up in one place.
- **Typed outcomes.** A step finishes with a result the engine understands, not a paragraph. The next transition is code, not a judgement.
- **Retries reopen dependents.** If the tailored resume is regenerated, everything built on it is out of date. Retrying a step reopens the steps that depend on it and voids their old approvals, so a member never approves an email that quotes the previous resume.
- **A kill switch and a sweeper.** Runs can be stopped with one switch, and a sweeper picks up runs that have gone stale instead of leaving them half done.

```js
// Simplified sketch; the dependency edges are illustrative
const DEPENDS_ON = {
  ats_scan: ["track"],
  find_contact: ["track"],
  tailor_resume: ["ats_scan"],
  cover_letter: ["tailor_resume"],
  draft: ["cover_letter", "find_contact"],
  send: ["draft"],
};

function dependentsOf(step) {
  const direct = Object.keys(DEPENDS_ON).filter((s) => DEPENDS_ON[s].includes(step));
  return direct.flatMap((s) => [s, ...dependentsOf(s)]);
}

async function retryStep(run, step) {
  for (const s of new Set([step, ...dependentsOf(step)])) {
    await run.steps.reopen(s);
    await run.approvals.voidFor(s);
  }
  await queue.add("run-step", { runId: run.id, step });
}
```

The models in Autopilot do real work inside steps, such as tailoring a resume or writing a cover letter. But no model decides what the next step is. The engine does.

## The Mandate Assistant: the plan is the hard part

A recruiting mandate is different. The work is a long series of small decisions that depend on things nobody can list in advance. A client replies with a vague objection. A candidate asks to move an interview. Three profiles are in, but the client said last week they want more seniority.

There is no fixed sequence here. "What should happen next?" is itself the hard question, and answering it well means reading email, checking the pipeline and weighing what the client said. That is what models are good at, so the Mandate Assistant is an agent: it chooses tools, reads results and proposes actions.

Even so, it leans on code wherever it can. A signals engine computes stage lag and unanswered client mail. A per-turn snapshot hands over the current state. Every write waits for an approval card. The agent's freedom is in choosing what to do, not in computing facts or skipping checks.

## How I choose

These are the questions I ask now.

**Can you write the steps down?** If you can draw the flow on a whiteboard and it is the same for every case, build a workflow. Putting a model in charge of a known sequence adds cost, latency and a new way to fail, and buys nothing.

**Do you need per-step guarantees?** Retries, timeouts, idempotency, metrics per step, a clear answer to "where is this stuck?" A state machine gives you those almost for free. An agent loop gives you a transcript.

**Is the input open-ended?** If the next action depends on reading unstructured text, and the space of situations is large, an agent earns its place. Encoding every branch of a client conversation as states is how you end up with a state machine nobody dares to change.

**What does a mistake cost, and when do you catch it?** A workflow fails in known places. An agent can fail anywhere, so it needs approval cards, read-only tools and gates around it. If you cannot afford that scaffolding, you probably cannot afford the agent.

**Does the cost need to be predictable?** A workflow's cost per run is roughly the sum of its steps, and you can see which step is the expensive one. An agent's cost depends on how many turns it takes, which depends on the input. That is acceptable for a recruiter's working session. It is much harder to accept for something that runs for every member, every morning, at volume.

**Who has to understand it?** Support and operations can read a state machine's status. "The run is at cover letter, retried twice" is an answer. "The agent decided not to" needs an engineer and a transcript.

## Most real systems are both

The interesting designs mix the two.

A workflow can call a model inside a step, which describes most of Autopilot. An agent can sit inside a fixed structure, which is how I think about the Mandate Assistant's headless driver. It works through seven stages, through offer, joining, invoice and collection, and stops at every sign-off gate. The stages and the gates are the fixed frame. The open-ended judgement happens inside a stage.

The mistake is picking one shape for the whole system out of habit. Use the state machine for the parts you understand, and the agent for the parts you cannot write down.

## Takeaways

1. **Known sequence, known inputs: build a workflow.** Models can still run inside the steps.
2. **Open-ended input, and the next step is the hard part: build an agent,** and surround it with code-computed facts and approval cards.
3. **Make retries structural.** Reopen dependents and void stale approvals.
4. **Mix the two on purpose.** Fixed stages and gates outside, judgement inside.
