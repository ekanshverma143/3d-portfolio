---
title: "Evals from real questions, against live data"
description: "My agent eval set is twelve real leadership questions graded against live data, where the right answer changes daily. How to build one that catches regressions."
date: "2026-11-03"
id: 16
tags: ["Evals", "AI agents", "LLMs"]
---

One of the agents I built at GoodSpace answers leadership questions from live data. It runs on the same engine as the Mandate Assistant and has 53 tools. Someone asks which roles are stuck, and it goes and finds out.

The hard part was never getting it to answer. It was knowing whether a change made it answer worse. A new tool, a reworded description, a different model setting: each of these can quietly break a question that worked last week, and the first sign is often a wrong number in front of the people who asked.

The check I rely on for this is small: twelve real leadership questions, checked against live data.

## Start from questions people actually asked

It is tempting to write eval questions yourself. They come out clean: one intent, exact wording, an obvious answer. Real questions are not like that. They use internal shorthand, ask two things at once, and lean on time words like "this week" or "lately" that the agent has to turn into a date range.

Those messy parts are exactly where agents fail. A synthetic question tests whether the model can answer a question. A real one tests whether it can work out what was asked.

Twelve is not many, and that is deliberate. A set that runs in minutes gets run. A set of three hundred gets run before big releases, which means it does not get run before the small changes that cause most regressions.

Pick the questions for coverage, not volume. Each should push the agent down a different path: a count, a list with a filter, a trend over time, a comparison between teams, a "why" question that needs two tools, and at least one where the honest answer is "there is no data for that".

## The right answer changes every day

This is what makes live-data evals different. Say one question is "Which roles have had no client reply in five days?" The correct answer today is not the correct answer tomorrow. A fixed expected value goes stale overnight, and a stale eval is worse than none, because it fails for the wrong reason until people learn to ignore it.

So each case should store how to compute the answer, not the answer. The reference is a query written in code, run at grading time against the same data the agent reads.

```js
// Simplified sketch
const cases = [
  {
    id: "no-client-reply-5d",
    question: "Which roles have had no client reply in five days?",
    truth: (db) => db.rolesAwaitingClientReply({ days: 5 }),
    check: (answer, truth) => sameIds(idsMentioned(answer), truth.map((r) => r.id)),
    expectTools: ["client_mail_status"],
  },
];
```

Two details make this hold up.

**Bracket the run.** Data moves while the agent works. Compute the truth just before the agent starts and again just after it finishes, and accept an answer that matches either. A role that got a reply in the middle of the run should not fail the case.

**Record the truth with the result.** If the honest answer today is "none", the agent passes by saying none. That is a real pass, but an easy one. Saving the computed truth next to the verdict lets you see when a green run was green because the question happened to be trivial that day.

## Grade in layers

An answer has more than one way to be wrong, so the check should have more than one part.

**Facts.** The numbers and names in the answer match the reference. This is a code check wherever possible. If you need a model to pull the figures out of prose, give it that one narrow job and nothing else. I wrote about keeping that kind of step narrow in [LLM judges: one narrow question, or none](/blog/llm-as-judge-carefully).

**Path.** The agent used the tools you would expect and did not wander. Getting the right number from the wrong source is luck, and luck does not survive the next change in the data.

**Honesty.** It stated the time window it used. When data was missing, it said so instead of filling the gap. This layer catches the most dangerous failures, because a confident wrong answer and a confident right answer look the same to the person reading them.

## Live data needs an agent that cannot write

Running an eval against production data sounds risky, and it is, unless the agent cannot change anything during the run. If your agent can write, it needs the guarantees I described in [Give your agent your permissions, not more](/blog/agent-permissions-not-more): reads inside read-only transactions, and every write turned into a proposal that the eval never approves.

Run the eval under an identity with the same permissions as the people who ask these questions. An eval that runs as an admin will pass questions that real users cannot get answered.

## Run it before every change

The set earns its keep when it runs before any change to the agent, not just before releases. Things that count as a change:

- prompt or standing-rule edits
- a new tool, or a reworded tool description (with 53 tools, picking the right one is a real skill, and a new neighbour can steal another tool's calls)
- a different model or effort setting
- the shape of the state the agent receives each turn

Compare against the previous run, not against a perfect score. Some cases will fail for reasons that have nothing to do with your change, such as a data quirk that day. What you are looking for is a case that flips. When one flips, rerun it a couple of times before believing it, because model output varies from run to run. A case that fails three times in a row is a regression. One that fails once in three is a flaky case, and that is worth knowing too.

Keep the tokens, cost and latency of every case next to its verdict. A change that keeps every answer right while doubling the tokens per question is still a regression, just a different kind.

## Grow the set from real failures

When someone reports a wrong answer, find the turn (this is where good per-turn logs pay off; see [What to log for every agent turn](/blog/observability-for-llm-apps)) and turn the question into a case before fixing anything. Then fix it and watch the case go green. The set stays small, but every case in it is there because the failure was real.

Check the grader too when a case fails. A reference query with a bug in it fails the agent for being right. Read the transcript before touching the prompt.

## What I would take from this

1. **Use real questions.** The mess in them is the test.
2. **Store the computation, not the answer.** Live data needs a reference query, run at grading time and bracketed around the agent's run.
3. **Grade facts in code.** Use a model only for the narrow parts code cannot check.
4. **Run it before every change, and compare to the last run.** A flipped case is the signal; a perfect score is not the goal.
