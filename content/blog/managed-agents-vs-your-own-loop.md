---
title: "Managed agents vs your own agent loop"
description: "A provider-run agent runtime or a loop you write yourself? Where tools run, who owns history, config across accounts, failover, cost and lock-in, weighed honestly."
date: "2026-11-01"
tags: ["AI agents", "LLMs", "Cost"]
---

The Mandate Assistant runs on Claude Managed Agents, a provider-managed agent runtime, and three more agents run on the same engine. The alternative is the pattern most people start with: call the model, run the tools it asked for, append the results, call it again, all in your own code.

Both work. They put the hard parts in different places. This is a look at where, not a pitch for either.

## What each one is

With your own loop, the conversation is an array you own. You send it to the model, read the reply, run any tool calls, append the results and send the whole thing again. Everything about the loop is yours: when to stop, what to trim, what to cache, how to retry.

With a managed runtime, you define an agent once (model, system prompt, tools, skills) and start sessions against it. The provider runs the loop and keeps the session's history. You send messages in and read a stream of events out. When the agent wants one of your own tools, the session waits, your code runs the tool and sends the result back, and the loop carries on.

## Where tools run

This was the question I cared about most, and the answer is reassuring: custom tools still run in your code.

All 42 of the Mandate Assistant's tools are custom tools that run on our server as the signed-in user. The runtime decides *that* a tool should be called; our server decides whether it may run, and with whose permissions. Read-only SQL, the allowlisted collections, approval cards for writes: none of that moved to the provider. [Give your agent your permissions, not more](/blog/agent-permissions-not-more) applies the same way on either side.

What changes is the path. A tool call becomes an event that arrives on a stream, waits for your result, then resumes. Your server has to stay connected, notice a pending call after a reconnect, and answer it. In your own loop, a tool call is a function call inside one process. That is simpler to reason about and much easier to debug.

## Sessions and history

A managed runtime keeps history for you. That is convenient, and it is also a constraint: the conversation the model sees lives with the provider, inside one account.

I keep our own copy anyway. Chat history lives in our database, and documents are kept in S3 so they can be uploaded again. That turned out to matter a great deal, as the failover section shows.

Your own loop gives you direct control of the context. You can drop stale tool results, put stable content first for caching, and start fresh when the context grows. With a managed runtime you get similar results by designing around the session rather than editing it. About 8K characters of standing rules that used to travel with every message now go once per session, and the fresh-session thresholds came down from 100K and 300K tokens to 80K and 150K. Both were easy changes because nothing important lived only in the session. The details are in [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model).

## Config as code, across accounts

A managed agent is a stored, versioned object. That is a real benefit: the definition is not scattered through request-building code, and sessions run against a known version.

The risk is that a stored object invites editing by hand in a console, and then the definition in production is something nobody reviewed. I keep every agent as code: an agent.json and a skill folder in the repository, synced by one script that has a dry run showing what would change before anything does.

That matters more because we run on a pool of provider accounts, and every account needs the same agents. One script updates all of them. With your own loop, the agent is simply code you deploy, so this whole problem does not exist. That is a genuine point in the loop's favour.

## Failover

Every agent and Claude call in our system runs on that pool of accounts. The switching rules are deliberately narrow:

- Switch only when the error says the credit balance is too low. A timeout or a server error is not a reason to move.
- Retry once on the new account.
- Never switch back while the current account works.

The rules are narrow because switching is not free. A session in one account does not exist in another. Our chats survive a switch only because history lives in our database and documents are re-uploaded from S3. When the runtime owns your history, failover becomes a small data migration. When your loop owns it, failover is much closer to changing a key. I covered the account pool with 11 unit tests, dependencies stubbed, because it is code that runs rarely and has to work the first time it does.

## Cost visibility

In your own loop, every response carries its token usage, and you can log it next to the request that caused it. Cost per turn falls out naturally.

A managed runtime still reports usage, but its bill can be made of more than tokens, and it is easy to lose the link between a session and the work it did. I keep a per-turn cost ledger in our own database and read live spend from the provider's cost report, so "what did this mandate cost?" has an answer that does not depend on anyone's dashboard.

## Lock-in

The honest summary: a managed runtime is more lock-in than your own loop, but less than it looks if you design for it.

What stays portable in this setup: the tools (our server's code, behind our own authorization), the history (our database), the shared per-mandate brief that carries research across sessions and users, and the agent definitions (files in the repository). What does not: the event protocol, the session semantics and the shape of the agent config. Leaving would mean writing a loop and an adapter for those, not rebuilding the agent.

## How I would choose

A managed runtime fits when you want long-running, multi-turn sessions without hosting the loop, you value versioned agent definitions, and your team would rather not own context management.

Your own loop fits when you need full control of the context, debugging inside one process, fallback across models or providers, or you would rather not have conversation history stored with the provider at all.

Either way, keep three things on your side of the line: tool execution and permissions, the source of truth for history and memory, and the cost ledger. Then the runtime is a choice you can revisit, not a foundation you are stuck with.

## Takeaways

1. **Your tools can stay yours.** With custom tools, execution and permissions remain on your server.
2. **Keep your own copy of history.** It is what makes failover and inspection possible.
3. **Define agents as code and sync them with a dry run.** Do not hand-edit them in a console.
4. **Fail over narrowly.** Switching has a cost, so do it only for the error that demands it.
5. **Own the cost ledger,** whichever runtime you choose.
