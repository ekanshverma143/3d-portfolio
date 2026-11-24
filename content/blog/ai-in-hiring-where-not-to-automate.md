---
title: "AI in hiring: what I will not let it decide"
description: "In hiring, a wrong AI answer costs a person, not a page view. Evidence behind every score, hard must-haves, fields never auto-filled and human sign-off gates."
date: "2026-10-20"
tags: ["AI agents", "LLMs", "Product engineering"]
---

A lot of what I build at GoodSpace touches hiring: ranking candidates for a role, screening them over the phone, running a recruiting mandate from intake to offer, and filling in job applications on a member's behalf.

Hiring is a domain where AI is unusually useful and unusually easy to misuse. The volume is real; nobody can read two thousand profiles carefully. But every output is a decision about a person, and that person is not in the room when it is made.

So much of my design work here is deciding what the model does not get to do.

## Why hiring is different

Three things make hiring stricter than most places AI gets used.

**The errors are invisible.** If a product search ranks something badly, someone notices the bad results. If a candidate ranking quietly buries a strong person, nobody files a bug. The candidate never hears back and assumes they were not good enough. False negatives in hiring produce no feedback signal, so you cannot wait for complaints to find them.

**People defer to numbers.** Show a reviewer a score of 82 and they anchor on it. A score without reasons turns a judgement aid into a verdict, because the reviewer has nothing to disagree with.

**The stakes are recognised outside engineering too.** Regulators increasingly treat AI used in recruitment as high-risk; the EU's AI Act puts it in exactly that category. Even where no rule applies, the person affected deserves an answer to "why?".

## Every score comes with its evidence

The candidate pool ranking I built scores the whole top 2,000 candidates for a role, not just the top 200. Every fit score it shows a reviewer comes with the evidence behind it.

That changes what the reviewer does. Without evidence, they accept the number or ignore it. With evidence, they check it. Say a reviewer sees a high score backed by "five years of backend work in payments". They can open the profile and agree, or notice that the five years were an internship plus a side project. That disagreement is the point. It is the reviewer doing their job, and the system making it possible.

Two more rules keep scores honest.

**Scores are re-run when the criteria or the job description change.** A score only means something against the criteria it was computed for. If the hiring manager adds a requirement and the old scores stay, the shortlist is ranked for a role that no longer exists. Stale scores look exactly like fresh ones, which is what makes them dangerous.

**Must-have questions zero the score.** If a role has a hard requirement, say a city the person must work from or a licence the job legally needs, failing it is not a small deduction. It sets the score to zero. A weighted model can always trade a missing must-have against strengths elsewhere, and that is precisely the trade the client said they would not make. A hard requirement belongs in code as a gate, not in a model as a weight.

```js
// Simplified sketch
function fitScore(candidate, role) {
  const failed = role.mustHaves.filter((q) => !passes(candidate, q));
  if (failed.length > 0) {
    return { score: 0, evidence: failed.map((q) => `Did not meet: ${q.label}`) };
  }
  return rankAgainstCriteria(candidate, role.criteria); // { score, evidence }
}
```

The AI phone screening calls follow the same rule: must-have questions are graded strictly. A vague answer to a must-have is not a pass.

## Facts about the role come from structured data

When I worked on the quality of those screening calls, the clearest lessons came from production transcripts. One of them: a join bug had left the role facts empty, and the model improvised. It sounded fluent and was wrong.

The fix was to stop asking the model to know anything about the role. Role facts now come from structured columns, never from a free-text job description, and the screening phase itself moved under server control. In hiring, an improvised fact is not cosmetic. A candidate told the wrong location or the wrong kind of role makes real decisions on it.

## Fields that software does not fill

GoodSpace Autopilot fills in job application forms for members, and some fields it refuses outright, whatever it could produce: self-identification questions and legal attestations among them. I covered the resolver in [Filling job application forms without guessing](/blog/form-filling-without-guessing). The principle deserves its own statement here.

Some answers are not information. They are acts. A self-identification answer is a person's own statement about who they are, and they are entitled not to give one. A legal attestation, like declaring that the details are true or confirming eligibility to work, is a declaration the candidate is accountable for. Software that infers either, however confidently, is speaking for a person in a way they never authorised. The right output is a blank and a note saying the question is theirs to answer.

The same reasoning carries over to ranking. An attribute the hiring decision should not depend on should not be in the model's context at all. A model cannot weigh what it never sees.

## Humans sign off on decisions

The Mandate Assistant can carry a mandate through seven stages, through offer, joining, invoice and collection. Its headless driver moves a lot of that along on its own, and it stops at sign-off gates.

Gates belong wherever a decision is about a person and hard to undo. Everything around those points, the scheduling, the follow-ups, the paperwork and the reminders, is fair game for automation. The decision itself is not. And every write the assistant proposes appears as an approval card with the exact payload, so whoever signs off sees the real message going to the real person, not a summary of it.

Automation should remove the busywork around a decision. It should not remove the decision.

## What explainability actually buys

Explainability in hiring is often framed as compliance. It is more practical than that.

Evidence is how a reviewer catches a wrong score. It is how a recruiter answers a client who asks why a candidate is ranked first. And it is how I debug the system: when a ranking looks wrong, the evidence shows whether the problem is in the data, the criteria or the model. A score with no reasons is unfair to the candidate, and it is also impossible to improve.

## Takeaways

1. Show the evidence behind every score, right next to the score.
2. Make hard requirements gates in code, not weights a model can trade away.
3. Re-run scores whenever the criteria change. Stale scores look like fresh ones.
4. Take facts about the role from structured data, never from the model's memory or guesswork.
5. Never let software answer for a person. Self-identification and legal attestations stay blank.
6. Put human sign-off on decisions about people, and automate everything around them.
