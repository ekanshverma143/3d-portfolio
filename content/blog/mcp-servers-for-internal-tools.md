---
title: "Putting internal tools behind MCP, carefully"
description: "What to decide before exposing internal systems to an AI assistant over MCP: read-only by default, scoped to the signed-in user, and tools a model can use well."
date: "2026-11-06"
tags: ["MCP", "AI agents", "Security", "Developer tools"]
---

Most companies have the same quiet problem. The useful data lives behind an admin panel, a few internal APIs and a database that only engineers query directly. People who need an answer either learn the panel, ask an engineer, or wait for a report.

AI assistants open another route: let the person ask in plain English and let the assistant fetch the answer. The Model Context Protocol is the standard way to wire that up. I built a Claude Desktop connector for the system behind the Mandate Assistant, and several agents that read live company data through tools, and the protocol was never the hard part. The engineering is in deciding what to expose and how.

## MCP in one paragraph

MCP is an open protocol between an AI application (the host, such as Claude Desktop or an IDE) and a server that you write. The server advertises what it offers: mainly tools (named functions with a JSON Schema for their inputs), resources (data the client can read) and prompts (reusable templates). Messages are JSON-RPC. A local server usually runs as a child process over stdio; a remote one is reached over HTTP. The model sees your tool names, descriptions and schemas, decides when to call them, and reads whatever you return. That is the whole contract, which is why the choices inside it matter so much.

## Read-only by default

The first decision is one I would make the same way every time: a new connector starts read-only.

Reads are where most of the value is. "Which mandates have had no client reply this week?" or "How many candidates reached interview last month?" are questions people actually ask, and answering them changes nothing. A wrong read costs a follow-up question. A wrong write can email a client.

Read-only also has to be true at the bottom of the stack, not just in the tool list. In the Mandate Assistant, SQL reads run inside a READ ONLY transaction with a 20 second execution limit and a 200 row cap, and Mongo reads are limited to seven allowlisted collections with no `$where`. The same layering belongs in a connector. If a tool is meant to read, the connection behind it should be unable to write, so a bug or a confused call cannot turn a read into a mutation.

The protocol lets a server annotate tools with hints, for example that a tool is read-only or destructive. Use them, because clients can show them to the user. But they are hints for the client, not enforcement. Enforcement lives on your server.

When writes do come, add them one at a time, each with a preview, and keep destructive actions off the connector entirely. In the Mandate Assistant every write already waits for an Approve or Reject card, and destructive actions are blocked. A connector deserves the same rule, not a looser one because it runs inside someone else's app.

## Scope the connector to the person

The tempting shortcut is one shared key for the whole team. Every request then runs with the key's permissions, and a sales rep's assistant can suddenly read things the sales rep cannot.

The rule I use for agents applies unchanged: the connector acts as the signed-in user, with their permissions and nothing more. Each person should authenticate as themselves, and every tool call should pass through the same authorization checks the internal panel already uses. Then there is no second permission model to drift out of sync. I wrote about that rule in [Give your agent your permissions, not more](/blog/agent-permissions-not-more).

If you issue personal keys for a connector, treat them like any API key. For GOODex's external API I stored keys only as SHA-256 hashes and cached the auth result in Redis for five minutes. Any auth cache is a trade-off worth saying out loud: unless revoking a key also clears its entry, a revoked key keeps working until the entry expires. For an internal connector, decide how long that window may be before you pick the number.

## Name and describe tools for the model

Tool names and descriptions are not documentation for engineers. They are instructions the model reads on every request.

A few habits help:

- **Name tools after the question, not the table.** `list_stalled_mandates` is easier to choose correctly than `query_stage_history`.
- **Say when to use it, and when not to.** One line on scope ("only mandates you can see") prevents a lot of wrong calls.
- **Keep the list short.** Every tool you add makes the others slightly harder to pick, and every description costs tokens on every request. More on that in [Designing tools for LLMs](/blog/designing-tools-for-llms).
- **Constrain inputs.** Enums for statuses, explicit date formats, sensible defaults. Free-text inputs invite the model to guess.

```js
// Simplified sketch, not a specific SDK
const tools = [
  {
    name: "list_stalled_mandates",
    description:
      "Mandates you can see that have stayed in one stage longer than its target. " +
      "Use for 'what is stuck' questions. Read-only.",
    inputSchema: {
      type: "object",
      properties: { stage: { type: "string", enum: ["sourcing", "interview", "offer"] } },
    },
    run: (args, user) => user.api.get("/mandates/stalled", { params: args }),
  },
];
```

The handler receives the user, not a shared client. That one parameter carries most of the security model.

## What to return

Whatever a tool returns goes straight into the model's context, so treat the response as a product.

**Bound it.** Cap rows, and say in the result when you truncated, so the model does not present the first 200 rows as the whole answer.

**Return facts, not raw dumps.** If a question needs "days since the last client reply", compute it on the server. Models are weak at date arithmetic and very confident about it. That was the core lesson of [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model).

**Include ids and links.** A person reading the answer in a desktop app will want to open the record. A stable id and a link to the internal page turn an answer into something they can act on.

**Make errors readable.** A failed call should say why in words the model can relay or fix. "No mandate matches that name; closest matches are these three" beats a stack trace, and it never leaks internals to the person reading.

## Check it against reality

An assistant that reads live data can be confidently wrong in ways nobody notices. For the leadership Q&A agent I keep an eval set of 12 real leadership questions and check the answers against live data. Twelve is a small number, but each one is a question someone actually asked, and a change that breaks one of them is a change I want to know about before anyone else does.

The same discipline applies to a connector. Pick a handful of real questions, write down what the right answer looks like, and run them whenever a tool, a description or a schema changes. Tool descriptions are prompts, and prompts regress.

## Takeaways

1. **Start read-only, and enforce it at the connection,** not only in the tool list.
2. **One identity per person.** No shared keys; every call goes through the authorization you already have.
3. **Treat names and descriptions as prompts.** Short list, clear scope, constrained inputs.
4. **Return bounded, computed, linkable results,** and errors the model can act on.
5. **Keep a small eval of real questions** and run it whenever the tools change.
