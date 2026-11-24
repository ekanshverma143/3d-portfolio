---
title: "LLM failover: switch on one error, never flap back"
description: "Running every agent on a pool of provider accounts: which error triggers a switch, why it retries exactly once, why it never switches back, and how chats survive."
date: "2026-11-05"
tags: ["AI agents", "LLMs", "Product engineering"]
---

Every agent and every Claude call I run at GoodSpace sits on a pool of provider accounts rather than on one. If an account runs out of credit in the middle of the working day, the agents move to the next account and carry on.

Failover sounds simple: on error, try somewhere else. Most of the design is in what that sentence leaves out. Which errors? How many tries? What happens when the first account comes back? What happens to a conversation that was halfway through?

## Switch on one specific error

The pool switches accounts only when the provider reports that the credit balance is too low. Nothing else triggers a switch.

That feels too narrow at first. Here is why each obvious alternative is worse.

**Rate limits and overloads** are transient. The SDK already retries them with backoff, and they usually clear quickly. Switching accounts on them turns a short wait into a permanent move, spreads traffic across accounts in a way nobody planned, and pays the switching costs described below for a problem that would have fixed itself.

**Server errors** are usually on the provider's side, not your account's. Another account with the same provider is likely to hit the same problem.

**Bad requests** are your bug. A malformed request fails on every account. Switching on it just walks through the whole pool and leaves you with the same error and a lot of noise.

Low credit is different: the account is the problem, and a different account is the fix. That is the one case where switching helps.

Because so much depends on recognising that one error correctly, the check belongs in one small function with tests, and nothing else in the codebase should try to guess.

## Retry once

After a switch, the failed request is retried once, on the new account. If that fails too, the error goes back to the caller.

Why not keep going down the pool? Because a second failure straight after a switch usually means something other than one empty account: the whole pool is low, the detection is wrong, or the request itself is the problem. Looping would hide all three behind a long wait and then fail anyway.

A retry is safe here because a request rejected for credit never ran. It also helps to be clear about what is being retried: the model call, not a tool. Side effects happen in tools, and in the Mandate Assistant every write goes through an approval card, so retrying a model call cannot send an email twice.

```js
// Simplified sketch
async function callWithPool(pool, send) {
  const account = pool.current();
  try {
    return await send(account);
  } catch (err) {
    if (!isCreditExhausted(err)) throw err;
    const next = pool.moveOn(account); // advances only if `account` is still current
    if (!next) throw err;
    return send(next); // exactly one retry
  }
}
```

One detail in that sketch matters more than it looks. When an account runs dry, many requests fail at the same moment. If each of them advances the pool, ten concurrent failures skip ten accounts. `moveOn(account)` advances only if the failing account is still the current one; every other request simply picks up the account the first failure already moved to.

## Never flap back

Once the pool has moved, it stays on the new account for as long as that account works, even after the old one is topped up. It never switches back on its own.

Flapping is expensive in ways that are easy to miss:

- **Caches are per account.** Prompt caches are not shared across provider organisations, so the first requests after any switch pay full price to write the cache again. Switching back and forth pays that twice.
- **Hosted state is per account.** Agent sessions and uploaded files live inside one account and cannot be read from another.
- **Debugging gets harder.** "Which account served this turn?" should have a boring answer. If the pool oscillates, the cost reports and logs for one hour come from two places.

If you do want to move back, make it a deliberate decision by a person, not something the pool does because the old account answered once.

## Conversations must survive the switch

A switch is only invisible if nothing important lived inside the old account. Our chats survive a switch because their history lives in our own database, and documents are re-uploaded from S3 to the new account.

That makes the provider-side session a working copy, not the record. When a conversation lands on a new account, it gets a new session there, the history comes from the database and the documents come from S3. The price is a slower turn while that happens.

This is the same idea as treating conversations as disposable, which I wrote about in [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model). If you can start a fresh session at any time without losing anything, a failover is just a fresh session on a different account.

## The same agent everywhere

A pool only works if every account runs the same agent. If someone fixes a prompt in one account's console, the agent behaves differently after a failover, which is the worst possible time to find out.

So agent definitions are code: an agent.json and a skill folder per agent, in the repository. One script syncs them to every account in the pool, and it has a dry run that shows what would change in each account before anything is written. The rule that goes with it: never edit an agent in a provider console.

Two things follow. Agent IDs differ between accounts, so code should look agents up by name through the pool rather than hold an ID. And an agent definition can reference a tool that the backend does not serve yet; sync it before that backend change is live and the agent will call a tool that does not exist. Sync after the deploy, then run the dry run again and expect no changes.

## Test it without waiting for an empty account

Credit exhaustion is hard to produce on demand, and you do not want the first real test to be a real empty account. The pool logic has 11 unit tests with its dependencies stubbed. With stubs, the cases worth covering are cheap to write: an account running dry halfway through a conversation, several requests failing at once, the last account in the pool failing, and an unrelated error that must not cause a switch.

## Different failovers, different triggers

Not every failover should be this strict. The meetings engine generates AI meeting and interview reports on a queue, and it fails over between Bedrock regions when it is throttled. There, throttling is the right trigger: each report is a queued job with retry and dedupe, there is no conversation to carry, and switching regions costs almost nothing.

Autopilot is different again: when its main model fails, a second model takes over.

The trigger depends on what a switch costs. When switching is cheap and stateless, switch freely. When it moves state, empties caches and changes which account is billed, switch only on the error that a switch actually fixes.

## What I would take from this

1. **Switch only on the error a switch fixes.** For an account pool, that is an empty balance, not a rate limit or an outage.
2. **Retry once, then fail loudly.** And make sure the pool advances only once under concurrency.
3. **Never flap back automatically.** Every switch costs a cold cache and re-created state.
4. **Keep the record outside the provider.** History in your database, files in your storage, agent definitions in your repository, synced everywhere with a dry run.
