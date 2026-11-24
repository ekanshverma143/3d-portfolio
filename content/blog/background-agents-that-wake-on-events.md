---
title: "Background agents that wake on events"
description: "A headless agent has no user to start each turn. What wakes it, how per-entity queues stop two wakes colliding, why it must stop at gates, and what people see after."
date: "2026-11-13"
tags: ["AI agents", "Node.js", "Observability"]
---

A chat agent has an easy life in one respect: a person starts every turn. Someone asks, the agent works, the agent stops. Nothing happens while the tab is closed.

The Mandate Assistant started that way. Its most recent form is a headless driver that runs on the server with nobody watching. The mandate is owned by a bot account with its own narrow role; the driver wakes when something happens, does the next piece of work and goes back to sleep. Getting that right was less about prompts and more about the plumbing around them: what wakes the agent, what stops two wakes from colliding, and what the people responsible see afterwards.

## What wakes it

A background agent needs a reason to run. The driver has five:

- **Intake.** A new mandate arrives.
- **A client reply.** New mail on the mandate's thread.
- **A due date.** Something scheduled is now due.
- **A signed gate.** A person signed off on something the driver was waiting for.
- **A periodic tick,** every ten minutes.

The first four are events: something changed, so look. The tick is the safety net. Events get missed. A webhook fails, a mailbox sync lags, a date is set somewhere nothing listens to. A periodic tick means that even if every event path breaks, each mandate still gets looked at regularly.

A tick should be cheap when nothing has changed. One way to get that is to hash the state snapshot the agent would see, the same way the interactive assistant avoids re-sending an unchanged snapshot, and skip the model entirely when the hash matches the last run. The snapshot idea is in [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model).

## One mandate, one queue

Wakes arrive in bursts. A client replies twice in a minute; a due date fires at the same moment as the tick. If each wake starts its own run, two copies of the agent read the same state and propose the same follow-up email.

So wakes do not run directly. They go onto a per-mandate Redis queue, and the mandate's work is drained from there. The property that matters is ordering per entity: different mandates run in parallel, and one mandate's wakes are handled one at a time.

```js
// Simplified sketch
async function wake(mandateId, reason) {
  await redis.rpush(`wakes:${mandateId}`, JSON.stringify({ reason, at: Date.now() }));
  await scheduler.ensureDraining(mandateId);
}

async function drain(mandateId) {
  const lock = await locks.acquire(`mandate:${mandateId}`, { ttlMs: 10 * 60_000 });
  if (!lock) return; // another worker already owns this mandate
  try {
    const wakes = await takeAll(`wakes:${mandateId}`);
    if (wakes.length) await runDriver(mandateId, wakes.map((w) => w.reason));
  } finally {
    await lock.release();
  }
}
```

Two details in that sketch are worth copying. Draining collapses every pending wake into one run with all the reasons attached, so a burst of three events costs one pass, not three. And the lock has a lifetime, so a worker that dies does not hold the mandate forever.

## Make every wake safe to repeat

Queues and webhooks deliver at least once in the normal case, so every wake has to be safe to handle twice.

The cheapest protection is to reason from current state rather than from the event. A background agent should ask "what is the state of this mandate, and what is missing?", not "what happened since last time?". A follow-up sent yesterday is visible in today's snapshot, so a repeated wake finds nothing to do. An agent that reasons from a stream of events has to remember exactly which events it has seen, and that bookkeeping is where duplicates come from.

Approval cards help too. The driver does not send anything directly; it proposes cards, and a card should not be created for an action that already has one pending or approved.

The same discipline applies to the non-agent background work I have built. AI meeting and interview reports run on a BullMQ queue with retry and dedupe. Lead research runs at concurrency 1 with a daily research budget. Autopilot has a sweeper for runs that went stale. None of these are clever. They are what lets work run unattended without someone checking on it.

## Stopping at gates

A background agent must know where it is not allowed to go.

The driver runs seven stages, through offer, joining, invoice and collection. It approves only the cards that are safe, and at every sign-off gate it stops and waits. A gate should be a state the agent cannot move past until a person signs, not a sentence in the prompt asking it to wait. Signing is itself a wake event, so the driver picks up where it stopped, with no loop polling for a human.

Budgets are the other kind of gate. The interactive assistant's autopilot mode has a step cap per run, and every turn writes to a cost ledger. A background agent needs those limits more, not less, because nobody is watching the meter.

## What the human sees

The hard part of a background agent is not running it. It is making its work legible to the people who own the outcome.

What I want from every wake, as the person responsible:

- **Why it woke.** The trigger, in words: "client replied", "interview due today".
- **What it did.** Cards it proposed, cards it approved itself, and anything it decided not to do.
- **Where it stopped.** "Waiting for sign-off on the offer." This is the most important line, because it tells a person what they owe.
- **What it cost.** From the same per-turn cost ledger the interactive assistant uses.

Much of this comes for free if writes are cards and facts come from code. The card log is the activity feed. The signals engine's output, stage lag and unanswered client mail, is the "needs attention" list. Background work stops feeling mysterious when it leaves the same artifacts a person's work would.

When someone does have the page open, push changes to them instead of making the page ask. In Autopilot, per-user live events go over Redis and SSE rather than polling, so a step finishing on the server shows up in the browser without a refresh.

## Takeaways

1. **Wake on events, and keep a periodic tick** as the net for the events you will miss.
2. **Queue per entity.** Different entities in parallel, one entity at a time.
3. **Reason from current state,** so handling a wake twice is harmless.
4. **Make gates states, not instructions,** and make signing a gate a wake event.
5. **Leave a trail a person can read:** why it woke, what it did, where it stopped, what it cost.
