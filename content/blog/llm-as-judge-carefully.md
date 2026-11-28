---
title: "LLM judges: one narrow question, or none"
description: "A second model can stop a bad answer before it ships, or double your cost and approve nonsense. When an LLM judge earns its place, and how to keep it narrow."
date: "2026-10-24"
id: 6
tags: ["Evals", "LLMs", "Cost"]
---

GoodSpace Autopilot fills in job application forms for members. One of its sources for an answer is an earlier answer the member gave to a question that means the same thing. Those matches come from embeddings, and Autopilot only reuses one after a second model confirms that the earlier answer actually answers this question.

I described the whole resolver in [Filling job application forms without guessing](/blog/form-filling-without-guessing). This post is about that second model, the judge. It is a pattern people reach for a lot, and I think it is worth having in a few narrow places and a waste of money in most others.

## What the judge is actually checking

An embedding match answers one question: are these two pieces of text about the same thing? The decision Autopilot needs is a different one: is this earlier answer a correct answer to this new question?

Most of the time those agree. "Notice period" and "When can you start?" are about the same thing and share an answer. Sometimes they come apart. "What is your current salary?" and "What are your salary expectations?" sit close together in embedding space, and reusing one answer for the other is a real mistake.

The judge exists to close that one gap. It is not reviewing the application or rating the quality of the answer. It checks one relationship between three short pieces of text.

That framing is most of the lesson. A judge is useful when it guards one specific, cheap step that is known to go wrong in a specific way.

## When a judge earns its place

I look for four things before adding one.

**The decision is yes or no.** "Does this answer this question?" has a right answer. "Is this a good cover letter?" does not, and a judge asked that will produce a confident number that means very little.

**A wrong yes costs far more than a wrong no.** If the judge says no when it should have said yes, the field falls through to the next source or stays blank for the member. If it says yes when it should have said no, a wrong answer goes to an employer. That asymmetry is what pays for the extra call.

**The judge can see everything it needs in a small input.** The new question, the earlier question, the earlier answer. Nothing else.

**Code cannot decide it.** If a rule or a lookup can make the call, use that. It is faster, costs nothing and never has a bad day.

## When it just adds cost

The last condition rules out more judges than the other three combined.

In lead qualification, a model researches a company and returns sourced facts. A 10-point score is then computed in code from revenue, staff size and financial strength. The score needs no judge, because there is nothing to judge: the arithmetic is deterministic and the facts carry their sources. A second model asked to "verify the score" would add cost and a new way to be wrong.

Other patterns I would avoid:

- **Judging everything.** If the risky case is rare, run the judge only on the path where it can happen. In Autopilot's resolver, a field answered by the profile or by the member's own answer bank never reaches a similarity match, so it never reaches the judge either.
- **The same model grading its own work with the same context.** It is likely to share the blind spots that produced the answer. A judge should see less than the generator, not the same transcript again.
- **Holistic scores.** A 1 to 10 quality rating averages strengths and failures into one number. In our phone screening calls, must-have questions are graded strictly, and in candidate pool ranking a failed must-have question sets the fit score to zero. A hard requirement should be a hard check, not one input to an average.

## Keeping it narrow

Once a judge is justified, most of the work is stopping it from growing.

**One question, one boolean, one short reason.** The boolean drives the code. The reason is for the logs, so a person can see why it said yes.

**Structured output.** Parse a field. Do not read prose looking for the word "yes".

**Unsure means no.** Tell the judge that, and enforce it in code: anything other than a clean yes is a no. A judge that fails open is a rubber stamp.

```js
// Simplified sketch
async function confirmReuse({ newQuestion, earlierQuestion, earlierAnswer }, judge) {
  const verdict = await judge({
    instruction:
      "Reply true only if the earlier answer is a correct answer to the new question. If unsure, reply false.",
    input: { newQuestion, earlierQuestion, earlierAnswer },
    schema: { reuse: "boolean", reason: "string" },
  });
  return verdict?.reuse === true; // errors, timeouts and odd output all count as no
}
```

**Small input, and maybe a small model.** Checking whether two questions match is an easier task than writing an answer, so a smaller, faster model is often enough. Test that on your own cases rather than assuming it. I use a small, fast model for a similarly narrow job elsewhere: turning a spoken voice command into exactly one structured command through a forced tool call.

**Cache verdicts.** The same pair of normalised questions will come up again. Storing the verdict means paying for each judgement once.

## Check the checker

A judge is a model, and it will be wrong sometimes. Treat its decisions as data.

Log every verdict with its inputs and its reason. Pull a sample regularly, weighted towards the yeses, because those are the expensive mistakes, and have a person label them. The number you care about is how often a yes was wrong.

Watch the yes rate over time as well. If it jumps after a prompt edit or a model change, the judge changed, not the forms. That is the kind of drift a judge can introduce without any error ever being raised.

The same rules apply when a judge grades an eval. Check facts in code, and ask a model only narrow questions, such as "does this answer state the time window it used?" One criterion per call, a boolean per criterion, and no overall score. I go into building that kind of eval in [Evals from real questions, against live data](/blog/evals-from-real-questions).

## What I took from it

- **A judge guards one step; it does not review everything.** Name the specific failure it prevents before you add it.
- **Add one only where a wrong yes is expensive and code cannot decide.** Otherwise it is cost and latency with a new failure mode.
- **Keep it narrow.** Small input, one boolean, unsure means no.
- **Measure it.** Sample its yeses, label them, and watch its yes rate after every change.
