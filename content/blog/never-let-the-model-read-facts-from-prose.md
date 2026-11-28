---
title: "Never let the model read facts from prose"
description: "A job description is written to attract applicants, not to inform a model. Why role facts on my AI calls come from structured columns, and how to make missing data loud."
date: "2026-11-02"
id: 15
tags: ["LLMs", "AI agents", "Evals"]
---

An AI screening call needs facts about the role: where it is, whether it is on site, the experience it needs, the must-have requirements. In most hiring systems those facts live in two places at once. There are structured columns, filled in through a form. And there is the job description, a block of prose that covers much of the same ground in more words.

The job description is tempting to use. It is always there, it is richer than the columns, and models read prose well. On our AI phone screening calls, role facts now come only from structured columns, never from the free-text description. This post is about why, and about the second half of the rule, which I learned from a bug: what the model does when a fact is missing.

## Prose is written to persuade

A job description is written to attract applicants. It is often copied from an older role, edited by several people, and rarely updated when the role changes. It says "competitive" where a number should be. It lists every city the company has an office in. It mixes "required" and "nice to have" in one bulleted list.

Say the description reads "Bangalore or remote" and the structured field reads "Bangalore, on site", because the policy changed last month and only the form was updated. A model reading both has no way to know which is current. It will pick one and state it on a call with full confidence.

Reading facts out of prose at call time has a second problem: it is not repeatable. The same description can produce a slightly different reading on each call, so two candidates for the same role can hear two different answers about the same requirement.

A structured field has none of these problems. It has a type, an owner, one value and an edit history. If it is wrong, it is wrong the same way everywhere, and someone can fix it in one place.

## How a missing fact becomes an invented one

Moving to structured columns was the easy half. The harder lesson came from a bug.

A join bug left the role facts empty on our calls. Nothing failed loudly. The context was built, the prompt rendered, and the calls went ahead with blank fields where the facts should have been. The model improvised.

That is the default behaviour, not a malfunction. From the model's side, a field that is absent or blank does not mean "unknown". It means "not mentioned". The model is trained to be helpful, the conversation calls for a detail, and nothing in front of it says "this is unknown, do not guess". So it reaches for whatever sounds plausible.

The lesson I took from it: a bug in data plumbing shows up as a model behaviour problem. If you only read transcripts, you can spend days adjusting a prompt to fix a join.

## Make missing data explicit

The fix is to make absence a value the model can see, and a condition the code can check.

**Render every expected field, always.** A missing fact should appear in the prompt as a marker with an instruction, not as a missing line.

**Validate before the model runs.** Build the context as a typed object and check the required fields. If one is missing, do not make the call; route it to a person. An honest "we could not call today" beats a confident wrong answer.

**Tell different kinds of missing apart.** "Not entered yet", "not applicable" and "deliberately not disclosed" are three different things and need three different instructions. A salary the employer chose not to share is policy. A salary nobody entered is a data problem.

**Watch the rate.** If the share of calls with a missing location suddenly jumps, that is a pipeline bug, not a data entry habit. An alert on missing-field rates points straight at a broken join.

```ts
// Simplified sketch: every fact is set, withheld on purpose, or missing.
type Fact =
  | { status: "set"; value: string }
  | { status: "not_disclosed" }
  | { status: "missing" };

const REQUIRED = ["title", "location", "workMode", "mustHaves"];

function assertCallable(facts: Record<string, Fact>) {
  const missing = REQUIRED.filter((k) => facts[k]?.status !== "set");
  if (missing.length) throw new MissingRoleFacts(missing);
}

function renderFact(name: string, f: Fact) {
  if (f.status === "set") return `${name}: ${f.value}`;
  if (f.status === "not_disclosed")
    return `${name}: not disclosed by the employer. If asked, say it is shared later in the process.`;
  return `${name}: unknown. If asked, say the recruiter will confirm. Never estimate.`;
}
```

The shape of the input matters more than any instruction in the system prompt. "Do not guess" in a system prompt competes with every helpful instinct the model has. A line that says "unknown, say the recruiter will confirm", sitting exactly where the fact would have been, is much harder to ignore.

## Where prose still belongs

None of this makes descriptions useless. Prose is fine for colour: what the team works on, what a normal week looks like, why the role exists. If the model paraphrases those a little loosely, nobody is misled.

The rule is about facts that can be wrong: numbers, places, dates and yes-or-no requirements. If a description holds facts the columns do not, extract them once, offline, into the columns, and have a person confirm them. Extraction then becomes a reviewed data entry step done one time, rather than a fresh guess on every call.

## Test the empty case

Most test fixtures are complete roles with every field filled in, so they never exercise the path that actually fails. Add the ugly ones: a role with every optional field missing, a role whose lookup returns nothing, a role where the salary is deliberately withheld.

Then put the obvious questions to the model, where is it, is it remote, what does it pay, and check that the answer defers instead of inventing. It is a small, cheap eval, and it is exactly the kind that catches a join bug before a single call goes out.

## The same rule, pointed the other way

Grounding applies to outputs too. When I built lead qualification, the model's job was to return sourced company facts, not a score, and code computes the score from those facts. A model asked for a number will always give you one. A model asked for facts with sources gives you something you can check.

I wrote about the state side of this in [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model), and about the same discipline on application forms in [Filling job application forms without guessing](/blog/form-filling-without-guessing).

## Takeaways

- **Facts come from fields, not from prose.** Prose is for colour; anything that can be wrong needs a typed, owned column.
- **Absence must be visible.** Render missing facts as explicit markers with instructions, never as blank lines.
- **Fail closed.** If a required fact is missing, do not run the conversation.
- **Expect plumbing bugs to look like model bugs.** Check the context the model actually received before changing the prompt.
- **Test with holes.** An eval with empty fields is the cheapest protection against an improvising model.
