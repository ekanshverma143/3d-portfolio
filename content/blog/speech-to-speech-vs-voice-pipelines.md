---
title: "Speech-to-speech or a voice pipeline?"
description: "One model that hears and speaks, or three that transcribe, think and talk. The real trade-offs in latency, control, transcripts, tool use and debugging."
date: "2026-10-30"
tags: ["Realtime voice", "LLMs", "Tool calling"]
---

There are two ways to build software that talks.

The classic one is a pipeline. Speech-to-text turns the caller's audio into words, a language model writes a reply, and text-to-speech reads it aloud. Three models, two hand-offs, and plain text in the middle.

The newer one is a speech-to-speech model. Amazon Nova Sonic is the one I know best: audio streams in, audio streams out, and a single model does the listening, the thinking and the speaking.

I have built on both shapes. At GoodSpace I rebuilt our AI video interviewer on Nova Sonic. I also built voice commands for an internal recruiting assistant, where a spoken instruction turns into exactly one command, and spoken answers for our internal agents through text-to-speech. From the outside these look like the same problem. They are not, and the choice is expensive to reverse once a product is built around it.

## Latency: fewer seams

In a pipeline every hand-off costs time. The speech-to-text stage has to decide that the speaker has finished, which usually means waiting for a stretch of silence. The language model then has to produce its first tokens. The text-to-speech stage needs enough of a sentence to sound natural before it starts. Good pipelines stream all three and overlap them, but each seam still adds its own wait, and the waits add up.

A speech-to-speech model removes the seams. It hears the end of the turn and starts producing audio in the same process. It also treats barge-in, the person talking over the AI, as part of the model, instead of something you build yourself out of a voice activity detector and a signal to cut the playback.

There is a quieter advantage too. A pipeline throws away everything in the audio that is not words: hesitation, pace, tone. A speech-to-speech model hears those and can answer in kind. For an interview, where the point is a conversation that feels natural, that matters as much as the milliseconds.

## Control: text in the middle is a handle

The pipeline's weakness on latency is its strength on control. Text in the middle means you can read, check and change what the AI is about to say before anyone hears it.

You can use any language model, including your strongest one, and swap it without touching the voice. You can check a reply before it is spoken: does the number it is about to read back match the database, is it promising something it should not. You can replace a reply with a fixed script for the lines that must be word-perfect, like a consent statement. You can pick the voice from any text-to-speech vendor and fix how it pronounces names.

With speech-to-speech you control the inputs: the system prompt, the history you seed it with and the tools you give it. The output arrives as audio, already spoken. If a sentence is wrong, the candidate has heard it.

## Transcripts: input or by-product

In a pipeline the transcript is the model's actual input. What speech-to-text wrote is exactly what the language model reasoned over, so the transcript is an honest record of the conversation as the system saw it.

Speech-to-speech APIs usually give you text as well: what the model heard and what it said. But that text is produced alongside the audio, not used to make it, so you cannot assume the model reasoned over exactly those words. When our interviewer's transcripts showed clear English as Hindi, the cause was not the model's understanding at all. The first fragment of speech was being clipped when the candidate talked over the interviewer, and a short hangover after barge-in fixed it.

If the transcript is a product in its own right, plan for it. Where I generate interview reports, a text model writes them afterwards from the transcript, so transcript quality is a hard dependency whichever architecture you choose.

## Tool use

Both shapes can call tools. In a pipeline it is the ordinary loop: the model emits a tool call, you run it, you feed the result back, and then you speak. Speech-to-speech models, Nova Sonic included, can call tools from inside the stream as well.

The difference is what the person hears while a tool runs. In a pipeline you own that gap: play a short holding line, or wait. In a stream the model has to talk around it, and a slow tool becomes an awkward silence. Keep tools in a live voice conversation few, fast and mostly read-only, and have the AI confirm out loud before anything that writes.

The recruiting assistant's voice commands sit at the other extreme. Turning an utterance into a command is a text problem with a strict output, so it runs on a small, fast model with one forced tool call. The result is always exactly one structured command, never a chatty reply, and any write is confirmed back to the user before it runs.

```js
// Simplified sketch: one utterance in, exactly one command out.
const res = await anthropic.messages.create({
  model: SMALL_FAST_MODEL,
  max_tokens: 300,
  tools: [commandTool],
  tool_choice: { type: "tool", name: "run_command" },
  messages: [{ role: "user", content: transcript }],
});
const command = res.content.find((b) => b.type === "tool_use").input;
```

A speech-to-speech model would add nothing here except less control.

## Debugging

A pipeline debugs like any pipeline, because every stage leaves an artifact: input audio, transcript, prompt, reply text, output audio. When something goes wrong you bisect. Did speech-to-text mishear, did the model answer badly, or did text-to-speech mangle a word?

Speech-to-speech gives you one box with audio on both sides, a stream of events and the side transcripts. So capture more around the box: record both directions, timestamp every event, and keep the prompt and seeded history for every session. Most of the interviewer bugs I fixed, from audio being sent faster than real time to the language mix-up, sounded like "it feels glitchy" and were obvious in a capture. I wrote about those in [Why TCP breaks live speech](/blog/why-tcp-breaks-live-speech).

One more thing to budget for: realtime sessions have limits. Nova Sonic streams cap out at roughly eight minutes, and our interviews run fifteen, so the server has to rotate streams without the candidate noticing. That is its own design problem, covered in [Designing conversations that outlive the stream](/blog/long-conversations-with-stream-limits).

## How I choose

Speech-to-speech fits when:

- the conversation itself is the product, and how it feels matters more than exact wording;
- turns are short, and natural turn-taking, interruptions included, matters;
- each turn needs modest reasoning and only a few fast tools.

A pipeline fits when:

- exact words matter: numbers, legal lines, anything read back;
- each turn needs your strongest model or heavy tool use;
- you must check or filter the reply before it is spoken;
- you want to swap vendors one stage at a time.

Often the right answer is both. Speech-to-speech for the live conversation, then a text model on the transcript for grading and reports, where latency no longer matters and control matters a lot.

## Takeaways

1. **Choose by what you must control, then tune latency inside that shape.** Moving between shapes later means rebuilding the product.
2. **Know whether your transcript is an input or a by-product.** Only the first is an exact record of what the model reasoned over.
3. **Keep live tools few and fast.** Silence is the price of a slow tool in a voice conversation.
4. **Capture both directions from day one.** A speech-to-speech model is a black box unless you record what goes in and what comes out.
