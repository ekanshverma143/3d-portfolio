---
title: "Small models, big models and no model at all"
description: "Not every request needs the biggest model, or any model. How I route between plain code, a small model with a forced tool call, a large model and a fallback."
date: "2026-11-07"
id: 20
tags: ["LLMs", "Tool calling", "Cost"]
---

A common way to build an AI feature is to send every request to the best model you can afford. It works on day one. Then people use it, and every button press waits on a model to decide something a lookup table could have decided instantly.

The pattern I keep coming back to is a ladder with four rungs: no model, a small fast model, a large model, and a second model for when the first one fails. Each request goes to the lowest rung that can handle it correctly.

## Rung zero: no model

The fastest, cheapest and most reliable model call is the one you never make.

In GoodSpace Autopilot, common intents are handled with no model call at all. Think of requests that have one obvious meaning and one obvious action: a button press, a status check, a pause. Code recognises them and does the work directly.

The test for this rung is simple. If there is one right answer and you can write down how to find it, write it down. Exact matches, button payloads, a short list of known phrases. These paths take microseconds, cost nothing and never hallucinate.

It also changes what the model sees. The requests that reach a model are, by construction, the ones that needed one.

## Rung one: a small model for a narrow job

Some inputs need language understanding but not much reasoning. Parsing is the classic case: free text in, a fixed structure out.

The Mandate Assistant takes voice commands. A spoken utterance becomes exactly one command, and that conversion runs on a small fast model, Haiku, through a forced tool call. The model is given a single tool whose input schema describes a command, and the request requires that tool to be used. It cannot reply with chat. It has to produce arguments in the tool's shape.

```js
// Simplified sketch
const res = await anthropic.messages.create({
  model: SMALL_FAST_MODEL,
  max_tokens: 300,
  tools: [commandTool], // { name: "run_command", input_schema: { ... } }
  tool_choice: { type: "tool", name: "run_command" },
  messages: [{ role: "user", content: utterance }],
});

const call = res.content.find((block) => block.type === "tool_use");
const command = validateCommand(call?.input); // code still checks it
```

Two details matter as much as the model choice.

The first is the validation after the call. A forced tool call makes the model answer in the right shape. It does not make the answer right, so code still checks that the command exists and that its arguments make sense.

The second is what happens before anything runs. If the command would write something, it is read back to the user and confirmed first. The small model's job is to understand the request. The user still decides.

Why a small model here? Voice is where latency is most noticeable, because people pause and wait for a reply. Turning one sentence into one command does not need a large model's reasoning, and a smaller model answers sooner.

The same shape shows up elsewhere. In a rental search side project, Llama 3.1 8B turns "2bhk in Pune under 20000" into structured filters. In GOODex, our semantic candidate search, a model (Gemini) parses the query into structure before anything is searched. Parsing as its own narrow step, separate from everything after it, is a pattern worth reusing.

## Rung two: the large model for open reasoning

The large model gets what is left: open questions, multi-step work and judgement. Hypothetical examples: "which candidates on this mandate need attention, and why?", or "draft a reply that answers both of the client's questions". There is no schema for those answers and no rule that produces them.

Even on this rung, routing means not making the model do the code's work. In Autopilot, the model picks the tool; the server supplies the facts and matches the run. The model decides what should happen, and code knows what is true. [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model) goes into that split.

Cost on this rung is mostly prompt, and much of the prompt is tool declarations. I cut Autopilot's tool declarations from about 2.8k to about 1.3k tokens and kept them in a stable prefix that prompt caching can reuse. Fewer tokens means less to pay for and less to process on every call, and a stable prefix means most of what remains can come from the cache.

## Rung three: a second model when the first fails

Models fail in ordinary ways: timeouts, rate limits, throttling, malformed output. A feature that depends on one model inherits all of its bad days.

In Autopilot, a second model takes over when the first fails. The meetings engine that writes AI meeting and interview reports fails over across Bedrock regions when one is throttled. And every agent and Claude call we run sits on a pool of provider accounts that switches only when the credit balance runs too low, retries once, and never switches back while the current account works.

A few rules keep fallbacks safe:

- **Fall back on specific failures,** not on every error. A malformed request will fail on the second model too.
- **Do not flap.** Once you have moved, stay until there is a reason to move again. Switching back and forth on every blip makes behaviour impossible to reason about.
- **Keep state outside the call.** The account pool works because chat history lives in the database and documents can be re-uploaded from S3, so a conversation survives the switch.
- **Keep the output contract identical.** The fallback produces the same schema and is validated the same way, so nothing downstream needs to know which model answered.

The cheapest fallback is rung zero again. The regex in the rental search project takes over when the model fails, and a regex cannot time out.

## How I pick the rung

When a new kind of request appears, I ask in order:

1. Is there one right answer that code can compute? Then no model.
2. Is it turning a short input into a fixed shape? A small model, a forced tool call, validated output.
3. Does it need open reasoning or writing? The large model, with facts supplied by code.
4. What happens when that model is unavailable? There should be an answer before it ships.

Then measure it. Log which rung handled each request. If the large model keeps receiving requests a rule could answer, move them down. If the small model's output keeps failing validation for some intent, move that intent up.

## Takeaways

- Route each request to the lowest rung that can handle it correctly.
- Handle common intents in code. It is faster, free and never hallucinates.
- For narrow parsing, use a small model with a forced tool call, then validate.
- Confirm writes with the user, whichever model parsed the request.
- Keep tool declarations short and stable so caching can do its work.
- Plan the fallback before launch, and keep its output contract identical.
