---
title: "Approval cards are a product, not a checkbox"
description: "Human-in-the-loop fails when people approve without reading. What goes on an approval card, why it must carry the exact payload, and when a bot may approve."
date: "2026-11-11"
tags: ["AI agents", "Product engineering", "Tool calling"]
---

Most writing about human-in-the-loop treats it as a safety feature: a confirm step you add so you can say a human was involved. Built that way, it fails in a predictable direction. People approve everything without reading, because reading is slow and the confirm step does not tell them anything useful.

In the Mandate Assistant every write waits for an Approve or Reject card. In GoodSpace Autopilot, members approve by replying on WhatsApp. Building both convinced me that the approval step is not a gate bolted onto the agent. It is the main surface the human actually works in, and it deserves the same design care as any other screen.

The permission side of this, what the agent may do in the first place, is in [Give your agent your permissions, not more](/blog/agent-permissions-not-more). This post is about the card itself.

## The card shows the payload, not a summary

The most important rule: the card shows exactly what will execute.

Not "Send follow-up email to the client?" but the real recipient, the real subject, the real body and the attachment names. Not "Raise invoice?" but the amount, the line items and who it is addressed to. If a person approves a summary, they have approved the model's description of the action, and the model's description is the very thing they were meant to check.

That has a technical consequence. The arguments that render the card must be the arguments that run. Store the payload when the card is created, and on approval execute that stored payload, never a fresh call from the model.

```js
// Simplified sketch
async function approve(cardId, approver) {
  const card = await cards.get(cardId);
  if (card.status !== "pending") throw new Error(`Card is already ${card.status}`);
  if (card.stateHash !== (await currentStateHash(card.entityId))) {
    return cards.markStale(cardId); // the world moved since this was proposed
  }
  await cards.update(cardId, {
    status: "approved",
    approvedBy: approver.id,
    approvedAt: new Date(),
  });
  return tools[card.tool].run(card.payload, contextFor(approver)); // stored payload, unchanged
}
```

The staleness check is the part people skip, and I come back to it below.

## What else belongs on a card

Beyond the payload, a few fields make a card fast to judge:

- **Why.** One line from the agent on why this action, now. For example: "Client asked for two more profiles; these two passed screening." A reviewer who disagrees with the reason can reject without reading the email.
- **What it is based on.** Links to the thread, the candidate records or the data the agent used. A reviewer should be able to check any claim in one click.
- **Who asked.** The person whose conversation produced the card, or the trigger that woke a background run.
- **What happens on approve.** "Sends from your mailbox" or "Creates a draft invoice" tells the reviewer how reversible this is.

What does not belong: the model's internal reasoning, long previews of data that is not changing, or anything the reviewer has to scroll past to find the payload.

## Rejecting is input, not failure

A rejection carries information. When a reviewer rejects a card, the agent should see that, ideally with a short reason, and plan around it. "Wrong contact, send it to the hiring manager instead" is the cheapest correction you will ever get.

Editing is the other common case. Often the action is right and one line is wrong. Letting the reviewer edit before approving saves a round trip, but the edited version must be what is stored and what runs, and the record should show both the proposal and the edit.

## Cards go stale

A card is proposed against a particular state of the world, and that state moves. A client replies, a candidate withdraws, a teammate does the same thing by hand.

In Autopilot this became a rule in the run engine: when a step is retried, the steps that depend on it reopen and their old approvals are voided. An approval for a cover letter that has since been regenerated is not an approval of the new one.

The general version: an approval is valid for one payload and one state. If either changes, the card should say so and ask again, rather than quietly executing an intent that no longer fits.

## Meet people where they are

The approval surface does not have to be your app.

Autopilot asks members to approve on WhatsApp, because that is where they will see it within minutes. A reply is the approval. The channel's limits push the card toward the essentials: which company, which role, what will be sent, reply to approve. Having less room for detail is a useful constraint.

Voice is the extreme case. In the Mandate Assistant's voice commands, an utterance becomes one command, and any write is read back for confirmation before it runs. There is no screen to show the payload, so the confirmation has to say the parts that matter out loud: who, what, and how much.

## When the approver is not a person

Once every write is a card, the approver becomes a slot you can fill in different ways. The Mandate Assistant has an autopilot mode that clears cards itself, with a step cap, and a headless driver on the server that approves only safe cards and stops at sign-off gates.

The rule I would hold to for any automatic approver: safety is a property of the action, declared in code, not something the approver judges case by case. Low-risk internal updates are candidates. A message to a client, anything involving money and anything irreversible should wait for a person. The driver can be as clever as you like about *when* to propose. It should be boring about *what* it may approve.

## The audit trail is a feature

Every card is a record: what proposed it, what it said, who approved it, when, and what ran. That record answers the questions people ask weeks later. Why did the client get that email? Who approved this invoice?

I saw the other side of this when I rebuilt an admin audit trail from the MongoDB oplog. The oplog gave exact new values and times, and old values could be reconstructed by walking the changes oldest first. The actor was not there to recover, so I left it null rather than guess. Recording the actor at write time, which approval cards do by design, costs nothing. Reconstructing it later is often impossible.

## Takeaways

1. **Show the exact payload,** and execute the stored payload, not a regenerated one.
2. **Add the why and the evidence,** so a reviewer can decide in seconds.
3. **Treat rejections and edits as input** for the agent's next step.
4. **Expire approvals when the payload or the world changes.**
5. **Put the card where the approver already is:** a dashboard, a WhatsApp reply or a voice read-back.
6. **Let automatic approvers clear only actions that code marks as safe.**
