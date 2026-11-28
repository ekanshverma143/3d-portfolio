---
title: "One spread operator, every renewal"
description: "A subscription renewal bug that came down to two small decisions: copying an object with a spread, and claiming a payment outside the transaction that used it."
date: "2026-11-16"
id: 29
tags: ["JavaScript", "Payments", "Debugging"]
---

This is the story of a payments bug I fixed this year. It is a small bug with a large blast radius, and both halves of it are mistakes I think most JavaScript developers could make on a busy day.

The symptom was simple to state. Subscription renewals arrive as payment webhooks, the webhook endpoint was returning success, and yet the renewals were not being recorded.

## Half one: a spread is not a copy

Renewals were written inside a database transaction. The code took a connection from the pool and handed the transaction a wrapped version of it. Simplified, the wrapper looked like this:

```js
async function withTransaction(pool, work) {
  const conn = await pool.getConnection();
  const tx = { ...conn, query: conn.query.bind(conn), inTransaction: true };
  await conn.beginTransaction();
  try {
    const result = await work(tx);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

The renewal code called `tx.execute(...)`.

Object spread copies an object's *own enumerable properties*. It does not copy anything from the prototype. A mysql2 connection is a class instance, and `execute` lives on its prototype. So `tx` had `query`, because the wrapper added it by hand, and it had none of the methods nobody had thought to add.

`tx.execute` was `undefined`. Calling it threw a `TypeError` inside the transaction, and the transaction rolled back.

You can see the whole thing in four lines:

```js
class Conn { execute() { return "ok"; } }
const conn = new Conn();
const copy = { ...conn };
copy.execute; // undefined
```

## Half two: a claim outside the transaction

A rollback on its own should have been recoverable. Payment providers retry webhooks that fail, so the next delivery should have tried again.

It could not, because of an idempotency check. Before opening the transaction, the handler recorded the payment as claimed so that duplicate deliveries would not double-process it. That claim was written *outside* the transaction.

So the sequence for every renewal was:

1. Claim the payment. Committed immediately.
2. Open the transaction and try to record the renewal. Throws, rolls back.
3. The provider retries the webhook later.
4. The handler sees the payment is already claimed, treats it as a duplicate, and returns success.

Each failure left behind a tombstone that made the retry a no-op. The system had a retry mechanism and a deduplication mechanism, and together they guaranteed the work would never happen.

## The fix, in two steps

First, a one-line hotfix to stop the bleeding: expose `execute` on the wrapper the same way `query` was exposed.

Then the structural fix, which is the part that matters:

- **Stop pretending a spread is a copy.** The transaction wrapper now exposes the methods it needs explicitly, bound to the real connection, so no caller can reach for a method that silently is not there.
- **Move the claim inside the transaction.** The idempotency record and the renewal now commit or roll back together. If the work fails, the claim disappears with it, and the provider's retry genuinely retries.

## What I took from it

- **Spread copies data, not behaviour.** Never spread a class instance you intend to call methods on. Wrap it, bind what you need, or pass the original.
- **An idempotency marker must commit atomically with the work it guards.** Otherwise it is not deduplication. It is a way to turn one failure into a permanent one.
- **Acknowledging a webhook is a promise.** Returning success should mean "this work is durably done", not "I have seen this before".
- **Alert on the absence of success, not only on errors.** This bug threw an error that was caught and turned into a rollback, and then a duplicate that returned success. The signal that would have caught it on day one is a count of successful renewals that suddenly drops to zero.
