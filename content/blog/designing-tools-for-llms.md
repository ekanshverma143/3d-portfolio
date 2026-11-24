---
title: "Designing tools for LLMs: fewer, smaller, typed"
description: "Tool declarations are a token budget you pay on every turn. How I cut one from 2.8k to 1.3k tokens, and why the server, not the model, should supply ids."
date: "2026-10-28"
tags: ["Tool calling", "LLMs", "Prompt caching", "AI agents"]
---

When people first give a model tools, the instinct is to wrap every endpoint. Say the API has 60 routes; the agent gets 60 tools. It feels thorough. In practice it makes the model slower, more expensive and more likely to pick the wrong thing.

I have built tool sets of quite different sizes: 42 tools for the Mandate Assistant, 53 for a leadership Q&A agent, 40 for email operations, and the assistant inside GoodSpace Autopilot. The lessons that held across all of them are about the shape of each tool more than the count.

## Tool declarations are a token budget

Every tool's name, description and schema is sent with every request. They sit at the front of the prompt, before the conversation. That has two consequences.

First, they cost tokens on every turn, whether or not a tool is called. A verbose description is a tax you pay forever.

Second, they are part of the cached prefix. Prompt caching matches an exact prefix, so the tool list should be byte-stable: same tools, same order, same text on every request. If the tool set changes per request, or a description includes a date, the cache misses and you pay full price for the whole prefix.

In Autopilot I cut the tool declarations from about 2.8k tokens to about 1.3k, arranged around a stable cached prefix. Nothing clever went into it. The edits that do this kind of work are boring:

- **Remove parameters the model should never set.** If the server already knows a value, it does not belong in the schema.
- **Shorten descriptions to when-to-use.** The model does not need the history of the endpoint. It needs one sentence on when this tool is the right one, and sometimes one on when it is not.
- **Merge near-duplicates.** Two tools that differ by one flag are usually one tool with an enum.

## Let the server supply ids and facts

The most common tool-calling failure I see is not a bad decision. It is a bad argument: the model copies an id from three turns ago, picks the wrong one of two similar records, or produces a value that merely looks plausible.

The fix is to stop asking for those arguments. In Autopilot's assistant, the model picks the tool and the server supplies the facts, including working out which application run the member means. The model says "retry the cover letter"; the server knows which run is current for that member.

```js
// Simplified sketch
// Before: the model has to find and copy two ids correctly
const retryStepV1 = {
  name: "retry_step",
  input_schema: {
    type: "object",
    properties: { runId: { type: "string" }, stepId: { type: "string" } },
    required: ["runId", "stepId"],
  },
};

// After: the model names the intent, the server resolves the rest
const retryStep = {
  name: "retry_step",
  description: "Retry one step of the member's current application run.",
  input_schema: {
    type: "object",
    properties: {
      step: { type: "string", enum: ["tailor_resume", "cover_letter", "draft", "send"] },
    },
    required: ["step"],
  },
};
```

The second version is shorter, cheaper, and cannot target the wrong run, because the run was never the model's to choose. Who the user is, what they are looking at and which record is current all live in the session on the server. Tools should read them from there.

The same idea at a larger scale: the Mandate Assistant sends a state snapshot each turn, built from about ten parallel reads, so most questions need no tool call at all. A question answered from the snapshot is a tool call that cannot go wrong. I wrote about that in [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model).

## Some intents need no model

A related cut: if a request is common and unambiguous, do not send it to a model. In Autopilot, common intents are handled with no model call. A known action maps straight to the code that does it.

This is not anti-AI. It is putting the model where it adds something. Recognising "pause my applications" does not need reasoning; the long tail of odd requests does.

When a model is needed only to pick one action, make that explicit. For voice commands in the Mandate Assistant, an utterance becomes exactly one command through a forced tool call on a small, fast model (Haiku), and any write is confirmed back to the user before it runs. One utterance, one structured command, one confirmation.

## Reads and writes are different kinds of tool

I treat reads and writes as different types, not just different names. In the Mandate Assistant, reads run at once, every write waits for an Approve or Reject card, and destructive actions are blocked. The permission side of that is in [Give your agent your permissions, not more](/blog/agent-permissions-not-more).

The split also shapes how each tool is designed. A read tool can be broad and forgiving: optional filters, sensible defaults, generous matching. A write tool should be narrow and explicit. Every field that will end up in the outgoing email or the database row belongs in the arguments, so the approval card can show exactly what will happen.

## Typed outputs, not prose

Tool results are inputs to the model's next step, so give them a shape.

- **Typed outcomes.** Autopilot's steps finish with typed outcomes rather than free-form messages. "No hiring contact found" and "temporarily unavailable, retry later" (to take two examples) lead to different next steps, and the code can tell them apart.
- **Facts from the model, verdicts from code.** In lead qualification, the model returns sourced company facts, and code turns them into a 10 point score. Asking the model for a number out of ten invites a confident guess; asking for facts with sources gives you something to check.
- **Bounded size.** Row caps, plus an explicit flag when the cap is hit, so a partial list is never presented as the whole.

## Errors the model can act on

When a tool fails, the error message is a prompt. Write it for the reader who will act on it.

"Error 400" teaches the model nothing. It will usually retry the same call or apologise to the user. Compare:

- "No candidate on this mandate matches that name. Closest matches: (three names with ids)." The model can pick one or ask.
- "This action needs approval and has been sent as a card." The model knows to stop and tell the user.
- "Too many rows. Add a date range or a status filter." The model can narrow the query.

A good tool error says what was wrong, whether a retry makes sense, and what to try instead. It should never include secrets or stack traces, because anything you return may be shown to the user.

## When the model fails anyway

Even a well-designed tool set fails sometimes: a malformed call, a timeout, a provider error. In Autopilot, a second model takes over when the first fails. Short, plain tool declarations make that fallback much easier, because the second model reads the same small set of clear instructions instead of a sprawl tuned to one model's habits.

## Takeaways

1. **Count the tokens in your tool list.** It is sent every turn; keep it short and byte-stable so it caches.
2. **Never ask the model for what the server knows.** The user, the current record, the right id: resolve them on the server.
3. **Skip the model for common, unambiguous intents.**
4. **Make reads cheap and writes explicit.**
5. **Return typed results and errors the model can act on.** Its next step is only as good as what you hand back.
