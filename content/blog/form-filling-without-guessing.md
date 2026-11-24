---
title: "Filling job application forms without guessing"
description: "A wrong answer on an application form is worse than a blank one. How I built a Chrome extension that fills Greenhouse, Lever, Ashby and Workable forms in order of trust."
date: "2026-11-18"
tags: ["Chrome extensions", "LLMs", "Product engineering"]
---

GoodSpace Autopilot applies to jobs on a member's behalf. It started as my idea, and I built it with Akshat, who designed the product. One of its steps is the least glamorous and the most dangerous: filling in the company's application form.

It is dangerous because the cost is asymmetric. A blank field costs the member thirty seconds. A wrong answer, like claiming a work authorisation they do not have or inventing a year of experience, can quietly cost them the job. So the design goal was never "fill as many fields as possible". It was "never guess".

## Reading the form

The first job is just knowing what the form asks. A Chrome extension reads the page and turns every input into a normalised field: its label, type, options, whether it is required, and any help text around it.

Greenhouse, Lever, Ashby and Workable each render forms differently, with custom dropdowns, multi-step pages and labels that live in odd places. Normalising them into one shape means everything after this step is the same code for every applicant tracking system.

## Resolving each field in order of trust

The server answers each field by walking down a list of sources, from most trusted to least, and stops at the first one that can answer with confidence.

```js
async function resolveField(field, member) {
  if (NEVER_AUTOFILL.has(field.category)) return { status: "left_for_member" };

  return (
    fromProfile(field, member) ??
    fromAnswerBank(field, member) ??
    (await fromSimilarAnswer(field, member)) ??
    (await draftFromEvidence(field, member)) ?? { status: "left_for_member" }
  );
}
```

**1. The profile.** Name, email, phone, links, current company. These are deterministic mappings and they are always right, so they always go first.

**2. The answer bank.** Every time a member answers or corrects a question, the answer is saved against a normalised version of that question. The next form that asks the same thing gets the member's own words. The bank learns by itself as the member uses the product.

**3. Earlier answers matched by meaning.** Forms ask the same thing in many ways. "Notice period", "When can you start?" and "Earliest joining date" are one question. Embeddings find these matches well.

They also find dangerous ones. "Are you authorised to work in this country?" and "Will you need visa sponsorship?" sit close together in embedding space, and their answers are opposites. So a similarity match is never accepted on its own. A second model acts as a judge and has to confirm that the earlier answer actually answers *this* question before it is used.

**4. A draft from evidence only.** For free-text questions, like "Why are you interested in this role?", a model writes a draft. It may only use facts from the member's resume and profile. If there is no evidence to support an answer, the field is left empty for the member.

## Fields that are never filled

Some questions should not be answered by software, however confident it is: think self-identification questions or legal attestations. Fields like these are refused outright and left for the member, whatever the resolver could produce.

Making this an explicit list, checked before anything else runs, meant nobody had to remember it later. It is also the easiest rule to explain to a member who asks why a field is blank.

## Measure coverage per platform

Coverage is reported per ATS: of the required fields on a form, how many the resolver filled, and from which source.

Broken down by platform, it points at where a problem really is. If one ATS drops while the others hold steady, the likely cause is how that platform's form is being read, not the resolver. Without the breakdown it all looks like "the AI is filling fewer fields", and you end up tuning prompts to fix a parsing bug.

## What I took from it

- **Order sources by trust and stop early.** Most fields never reach a model. They are cheaper, faster and correct.
- **Similarity is not equivalence.** Any time an embedding match decides something that matters, put a check after it.
- **Grounding beats instructions.** "Only use the resume" works far better as the shape of the input than as a sentence in the prompt.
- **A blank is a valid answer.** The system earns trust by being visibly careful, and members forgive a blank field much faster than a wrong one.
