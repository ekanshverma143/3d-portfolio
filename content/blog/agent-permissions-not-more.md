---
title: "Give your agent your permissions, not more"
description: "How I gave an LLM agent 42 real tools across email, WhatsApp, SQL and payments without giving it any power its operator didn't already have."
date: "2026-11-20"
tags: ["AI agents", "Tool calling", "Security"]
---

When I started building the Mandate Assistant at GoodSpace, the first hard question was not which model to use. It was simpler and scarier: what is this thing allowed to do?

The assistant runs a recruiting mandate end to end. It reads email threads with clients, messages candidates on WhatsApp, places AI voice calls, queries our databases, generates PDFs and eventually raises invoices. That is a lot of reach for something that takes instructions in plain English and occasionally misreads them.

An agent with tools is a new kind of user in your system. How you model that user decides almost everything about how safe it is.

## The service account trap

The default most teams reach for is a service account. Create a bot user, give it the permissions the agent might need, hand the agent its credentials. It is quick, and it is wrong in three ways.

First, the agent's reach becomes the union of everything anyone might ask it to do. A recruiter who can only see their own mandates is suddenly talking to an assistant that can see all of them.

Second, the blast radius of every mistake is the service account's blast radius. A confused tool call, a prompt injection hidden in a candidate's email reply, or the model simply picking the wrong mandate ID can now touch anything the bot can touch.

Third, your audit log becomes useless. Every action says "bot did it", and you lose the one thing you need when something goes wrong: who asked for this.

## The rule: borrow the operator's identity

The rule I settled on was short. The agent acts as the person who is using it, with exactly their permissions and nothing more.

In practice that meant three things.

**API calls carry the operator's own token.** The tools do not get a privileged client. They get an API client bound to the signed-in admin's session, so every request goes through the same authorization middleware the admin panel already uses. There is no second permission model to keep in sync, and nothing to forget to update when roles change.

**SQL reads run inside read-only transactions.** The model never writes SQL that can mutate data, even by accident, because the connection itself refuses to. Each query also gets a 20 second execution limit and a 200 row cap, so a careless query cannot hurt the database or flood the context.

```js
async function readOnlyQuery(sql, params) {
  const conn = await pool.getConnection();
  try {
    await conn.query("SET SESSION MAX_EXECUTION_TIME = 20000");
    await conn.query("START TRANSACTION READ ONLY");
    const [rows] = await conn.query(sql, params);
    return rows.slice(0, 200);
  } finally {
    await conn.query("ROLLBACK");
    conn.release();
  }
}
```

**Document reads go through an allowlist.** Seven named collections, and no server-side JavaScript operators like `$where`. Everything else does not exist as far as the model is concerned.

With those three in place, the 42 tools could reach Gmail threads, Slack, WhatsApp, voice calls and generated documents, and the answer to "what can the agent do?" became "whatever you can do, and only that".

## Reads are free, writes are cards

Permissions answer *what* the agent may do. They do not answer *whether it should do it right now*. For that I used one more rule: every tool that changes state returns a proposal instead of acting. Destructive actions do not even get that far; they are blocked outright.

```js
const tools = {
  list_candidates: {
    kind: "read",
    run: (args, ctx) => ctx.api.get(`/mandates/${args.mandateId}/candidates`),
  },
  send_client_email: {
    kind: "write",
    preview: (args) => ({ to: args.to, subject: args.subject, body: args.body }),
    run: (args, ctx) => ctx.api.post("/emails", args),
  },
};

async function callTool(name, args, ctx) {
  const tool = tools[name];
  if (tool.kind === "read") return tool.run(args, ctx);

  const card = await ctx.cards.create({
    tool: name,
    args,
    preview: tool.preview(args),
    requestedBy: ctx.user.id,
  });
  return { status: "awaiting_approval", cardId: card.id };
}
```

The UI renders each proposal as an Approve or Reject card with the exact payload: the real recipient, the real subject, the real amount. When the operator approves, the same `run` executes with the operator's token.

This is much better than the agent asking "Shall I send the email?" in chat. A card is concrete and reviewable. It can be audited later. And, as it turned out, it can be approved by something other than a human.

## Turning autonomy up without new trust

Because every write went through the same card path, raising autonomy did not require trusting any new code.

The first version was pure approval cards. The second was an autopilot mode that clears cards on its own, with a hard cap on the number of steps per run. The third is a headless driver on the server. The mandate is owned by a bot account with its own narrow role, the way a new hire would be. The driver wakes on intake, a client reply, a due date, a signed gate or a ten-minute tick, approves only the cards that are safe, and stops at every sign-off gate on the way to invoice and collection.

Each step changed *who approves*, not *what executes*. The tool code, the permission checks and the audit trail stayed identical from day one. That is the main reason the team was comfortable turning autonomy up at all.

## What I would tell someone starting today

1. **Never create a super-user for your agent.** Bind it to the person using it. If you need an unattended agent, give it a real, narrow role, the way you would for a new hire.
2. **Make writes data, not side effects.** A proposed action you can render, diff and store is worth more than any amount of prompt engineering telling the model to be careful.
3. **Build the off switch first.** A kill switch, a dry-run mode and a per-turn cost ledger cost very little to add early and are painful to retrofit.
4. **Log who asked, not just what ran.** Every tool call should carry the operator's identity. When something goes wrong you will want the conversation that led to it, not a line saying the bot did it.

None of this is specific to recruiting. Any agent that touches real systems is a user, and the safest user is one who can do exactly what the person in front of it can do, and nothing more.
