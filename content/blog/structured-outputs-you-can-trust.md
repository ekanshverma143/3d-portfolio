---
title: "Structured output you can trust"
description: "A schema gets you valid JSON. It does not get you the right JSON. Forced tool calls, validation, a regex fallback and read-backs, from two systems I built."
date: "2026-11-09"
id: 22
tags: ["LLMs", "Tool calling", "Local LLMs"]
---

A lot of useful LLM features are the same feature underneath: free text goes in, a typed object comes out, and code acts on that object.

Two of mine sit at opposite ends of that pattern. In the Mandate Assistant at GoodSpace, a recruiter can speak a command, and the utterance becomes exactly one structured command. In a side project, a rental search assistant, Llama 3.1 8B turns "2bhk in Pune under 20000" into search filters. One runs on a hosted model with real writes behind it; the other runs on a small open model and only reads. Both needed the same three layers of trust:

1. **Shape.** Is the output a valid object of the right type?
2. **Meaning.** Do the values make sense and refer to real things?
3. **Intent.** Is it what the user actually meant?

Most advice about structured output stops at the first layer.

## Shape: make the model fill in a form

Asking for "JSON only, no prose" in the prompt is the weakest way to get structure. It mostly works, and "mostly" is not good enough when code acts on the result.

A forced tool call is much stronger. You define a tool whose input schema is the object you want, and set the request so the model must call that tool. The answer arrives as the tool's arguments, already parsed, instead of as text you have to dig JSON out of.

```js
// Simplified sketch
const commandTool = {
  name: "command",
  description: "The single command the user asked for.",
  input_schema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["list_candidates", "move_stage", "send_update", "unclear"] },
      target: { type: "string", description: "Who or what the command is about, in the user's words." },
      stage: { type: "string", description: "Destination stage, for move_stage only." },
    },
    required: ["action"],
  },
};

const res = await anthropic.messages.create({
  model: SMALL_FAST_MODEL,
  max_tokens: 300,
  tools: [commandTool],
  tool_choice: { type: "tool", name: "command" },
  messages: [{ role: "user", content: transcript }],
});
const command = res.content.find((block) => block.type === "tool_use")?.input;
```

For voice commands this runs on Haiku, a small fast model, because a spoken command should feel instant. Small models handle this well when the schema is narrow, and a few habits keep it narrow:

- **Enums for closed sets.** If there are a dozen possible actions, list them. A free-text action field invites near-misses that look right and match nothing.
- **One object, not a list.** The schema allows exactly one command, so the model has to choose.
- **A way out.** A forced tool call means the model must answer. Without an explicit option like "unclear", it will squeeze a garbled sentence into the nearest real command.
- **Descriptions on every field.** They are part of the prompt, and the cheapest place to put guidance exactly where it applies.

## Meaning: treat it like an untrusted request

A valid shape says nothing about whether the values are right. "Move the backend candidate to interview" can parse perfectly and still refer to nobody, or to two people.

So treat the parsed object the way you would treat a request body from an unknown client:

- **Validate the schema again on your side.** Do not assume the provider enforced every constraint.
- **Resolve references in code.** The model returns what the user said, "the backend candidate". Code looks that up among the records this user can see. Zero matches or two matches becomes a question back to the user, never a guess.
- **Check the action is allowed here.** The stage exists, the transition is legal, the date is not in the past.

Keeping resolution in code also keeps the model's job small. It only has to understand language. It never needs to know an ID, which means it can never invent one.

## When the model fails, fall back to something dumb

Models fail in boring ways. Requests time out. A small local model wraps its JSON in a friendly sentence, or stops halfway through an object. A provider has a bad hour.

In the rental search assistant the model is the first choice, and a regex parser is the fallback when the model fails. A fallback like this only has to handle the common shapes of a rental query: a number in front of "bhk", a city from a known list, and a figure after words like "under", "below" or "max". It is far less clever than the model. It has no idea what "near the metro" or "something cheap for a student" means. But it never times out, never invents a field, and still turns the most common queries into a working search when the model cannot.

The point of a fallback is not to match the model. It is to make failure degrade into "less smart" instead of "broken". Log every time it fires. A rising rate is an early warning that something upstream changed: a new model version, a prompt edit, or users phrasing things in a way nobody planned for.

## Intent: read it back before you write

The last layer is the one schemas cannot reach. The parse can be valid, the references resolved, the action legal, and it can still be not what the user meant. Speech makes this worse: recognition errors, words that sound alike, a sentence cut off halfway.

So voice commands in the Mandate Assistant follow a simple rule: writes are confirmed back to the user before they run. "Which candidates are waiting for feedback?" just runs, because a wrong read costs nothing but a second question. "Move the backend candidate to interview" is read back first, and runs only on a yes.

Two details decide whether a read-back is worth having:

- **Build it from the parsed object, not from the model's prose.** What the user confirms should be exactly what will run, rendered by code from the same fields the action will use.
- **Use the resolved names.** "Move this person, currently in screening, to interview?" with the real name filled in catches a wrong match. A vague "Shall I go ahead?" catches nothing.

It is the same idea as the approval cards in [Give your agent your permissions, not more](/blog/agent-permissions-not-more), shrunk to fit a voice interaction: a write is something you show and confirm, not something that simply happens.

## Takeaways

1. **Use a forced tool call** rather than asking for JSON in the prompt.
2. **Keep schemas narrow.** Enums, one object, field descriptions and an explicit "unclear".
3. **Validate like an untrusted request,** and resolve references in code so the model never handles IDs.
4. **Keep a dumb fallback,** so a model failure means "less smart", not "down". Log when it fires.
5. **Read writes back from the parsed object,** with resolved names, and run them only on a yes.
