---
title: "What I hand to an AI coding assistant, and what I keep"
description: "About 2,300 merged pull requests this year, much of it written with an AI coding assistant. What I delegate, what I always review myself, and where it goes wrong."
date: "2026-11-21"
tags: ["Developer tools", "LLMs", "Product engineering"]
---

Since January 2026 I have merged about 2,300 feature and fix pull requests across ten repositories, from roughly 3,300 commits. Much of that code was written with an AI coding assistant, and the history says so: the commits carry Claude as a co-author.

The number on its own says nothing about quality. What interests me is what it takes to work at that pace without the people who use the product paying for it. An assistant makes writing code cheap. It does not make being wrong cheap. Most of my working practice is about keeping those two things apart.

## The assistant writes, I own

The rule under everything else: if it merges under my name, I own every line. "The assistant wrote it" is not an explanation anyone affected by a bug wants to hear, and I do not accept it from myself either.

In practice that becomes a split between work I hand over freely and work I always check line by line.

## What I delegate

**Reading unfamiliar code.** Ten repositories is more than anyone can hold in their head. Asking the assistant where a field is written, which services consume a queue or what a route really returns is one of the most useful things it does. I treat the answer as a lead and then open the files it points to.

**Mechanical changes.** Renames, moving a helper, threading a new parameter through every call site. The intent is unambiguous, so review is fast: the diff either matches the intent or it does not.

**First drafts of tests.** Listing edge cases and writing scaffolding is tedious, and the assistant is good at it. A suite of unit tests with every dependency stubbed used to be the first thing cut when a deadline came close. It is cheap enough now that there is no excuse.

**One-off scripts.** Backfills, data checks, report queries. With one condition, which I will come back to: they start in dry-run mode.

**The paperwork around a change.** Pull request descriptions, migration notes, a list of what to check after the deploy. I still read them, because a wrong description misleads the next reader as surely as wrong code.

## What I always review myself

Some code is cheap to get slightly wrong. Some is not. These diffs I read line by line, every time, however small they are:

- **Money.** Payments, renewals, credits, anything near a ledger. A bug here rarely throws; it charges someone twice or not at all. [One spread operator, every renewal](/blog/one-spread-every-renewal) shows how small the cause of that kind of failure can be.
- **Permissions and identity.** Who can see what, and which identity a call runs as.
- **Writes to production data.** Migrations, backfills, anything with an update or a delete in it.
- **Concurrency and transactions.** What sits inside a transaction and what sits outside it, where a lock is taken, what happens on retry.
- **Agent prompts and tool definitions.** A one-line change to what a tool may do is a change to what an agent can do in production.
- **Anything that sends.** An email or a WhatsApp message to a real person cannot be recalled.

My test for these is simple. I should be able to explain the diff without looking at the conversation that produced it. If I cannot, it is not ready.

## Small pull requests are the main safety feature

Thousands of merged pull requests only work if most of them are small, because small is what makes review real.

A 40-line diff with one purpose gets read. A 1,500-line diff that refactors a module and also fixes a bug gets skimmed, by me and by anyone else, and that is where a stray change hides. An assistant will happily produce the second kind, since nothing stops it from tidying everything it touches on the way.

So I ask for narrow changes: one behaviour per pull request, no drive-by reformatting, nothing "while I was here". If the assistant edits a file the task did not need, that is a reason to stop and ask why, not to merge faster. Small pull requests are also easy to revert, which matters more than people admit.

## Tests and dry runs before trust

Two habits catch most of what reading misses.

**Run it, do not read about it.** A summary saying the change works is not evidence. A test that fails before the fix and passes after it is. So is output from the real code path. I would much rather see that than a confident explanation.

**Scripts are dry-run by default.** Anything that changes data prints what it would do and acts only when given an explicit flag. The backfill that recovered our admin audit trail from the MongoDB oplog works this way: idempotent, and dry-run unless told otherwise. The script that syncs our agent definitions to every provider account has a dry run too. The dry-run output is the thing I review: I read the plan, not only the code that made it.

```js
// Simplified sketch of the pattern
const commit = process.argv.includes("--commit");

for (const change of await planChanges()) {
  console.log(commit ? "apply" : "would apply", change.summary);
  if (commit) await change.apply();
}
```

Planning and applying are separate, so the dry run exercises the same code that will later write. [Kill switches and dry runs](/blog/kill-switches-and-dry-runs) goes further into that shape.

## Where AI help goes wrong

None of these are rare. They are what I look for in every review.

**Plausible API details.** The method name looks right and the option looks right, and neither exists in the version you run. Or it exists and does something subtly different. Mongoose, for example, silently drops fields the schema does not declare, so an update that sets such a field looks correct and does nothing.

**Fixing the test instead of the code.** Asked to make a failing test pass, an assistant will sometimes loosen the assertion. The suite goes green and the bug stays.

**Swallowed errors.** A `try`/`catch` that returns an empty list, a default value added "to be safe". A loud failure becomes quiet wrong data, which is worse.

**Duplicates instead of reuse.** A new helper, written because the one that already exists three folders away was not found. Now there are two, and they drift apart.

**The wrong version of the truth.** A local working tree is not always what is deployed. An answer built on a stale branch is confidently wrong about production.

**"Done" without proof.** A summary that says everything works is the assistant's opinion. Treat it like a colleague saying "should be fine", and ask to see it.

## What changes when code is cheap

Typing speed is no longer the constraint. What matters is deciding what to build, stating it precisely, and judging the result quickly and well. The assistant makes me faster at first drafts and at the parts I find tedious. Judgement is where the value has moved, so I spend more time on review, not less.

## What I would recommend

1. **Own every line.** Who typed it changes nothing about who is accountable.
2. **Know your high-risk areas** (money, permissions, production writes, concurrency, agent tools, anything that sends) and review those by hand.
3. **Keep pull requests small and single-purpose.** Reject unrelated edits, even ones that look like improvements.
4. **Ask for evidence, not summaries.** A failing-then-passing test or real output beats any explanation.
5. **Make every data script dry-run by default,** and read the plan before you add the flag.
