---
title: "Designing conversations that outlive the stream"
description: "Realtime model sessions have a time cap; interviews do not. How to rotate streams at turn boundaries, carry context forward, keep state server-side and test a 15-minute call."
date: "2026-10-19"
tags: ["Realtime voice", "AI agents", "Node.js"]
---

Every realtime model session has a limit. For the speech-to-speech model behind our AI video interviewer, a stream lasts roughly eight minutes. Our interviews run fifteen. Text agents hit the same wall in a different shape, as a context window or a cost threshold.

I described the symptom in [Why TCP breaks live speech](/blog/why-tcp-breaks-live-speech): around the eight minute mark, the interviewer lost the thread. The fix was to rotate streams at turn boundaries, before the cap, carrying the context into the new one. This post is about the design behind that, and about how to test something that only goes wrong ten minutes in.

## The stream is a worker, not the conversation

The mistake is to treat the model session as the conversation. If the stream holds the only copy of what has been said, the conversation ends when the stream does.

Turn it around. The server holds the conversation; a stream is a worker hired for a few minutes at a time. The state that has to live on the server:

- **The transcript**, both sides, turn by turn, as text.
- **The plan and the position in it**: which questions were asked, which were answered, what comes next.
- **The session configuration**: system prompt, voice and tools. The next stream must be configured identically, or the candidate meets a different interviewer.
- **The clocks**: when the interview started, when the current stream started, and the deadlines that follow from those.
- **Open resources**: every stream that is open, so every one can be closed.

With that in place, losing a stream, on purpose or not, is recoverable. Without it, every rotation is a gamble.

## Rotate at a boundary, before the cap

A rotation should never be forced by the cap. By the time the provider closes the stream, someone is probably mid-sentence.

Use two thresholds. Past a soft limit, the server starts looking for a turn boundary: a moment when one side has finished and the other has not started. Past a hard limit, still safely short of the cap, it rotates at the next pause even if that pause is not a clean boundary. A small seam is better than a stream that dies mid-word.

```js
// Simplified sketch. The limits are illustrative, set well inside the real cap.
const SOFT_LIMIT_MS = 5 * 60_000;
const HARD_LIMIT_MS = 7 * 60_000;

function shouldRotate(session, event) {
  if (session.toolCallPending) return false;
  const age = Date.now() - session.stream.startedAt;
  if (age > HARD_LIMIT_MS) return event === "pause" || event === "turn_end";
  return age > SOFT_LIMIT_MS && event === "turn_end";
}
```

Two details matter more than the thresholds. Do not rotate while a tool call is in flight, or its result arrives at a stream that no longer exists. And expect the person to start talking during the swap: open the new stream before closing the old one, and buffer incoming audio so their first words are not lost.

Audio has one more rule. The old stream's last words must finish playing before the new stream's first words start. One utterance should come from one source, the same principle that stopped single sentences playing twice in our interviewer when two transports overlapped.

## Carry the context, not just the words

Seeding the new stream with the conversation so far is the obvious part. It is not enough on its own. A model handed a transcript at the start of a fresh session can easily behave as if it is starting: a new greeting, a recap, a question it already asked.

So the seed has three layers:

1. **The same system prompt and configuration**, byte for byte.
2. **The conversation so far.** Recent turns verbatim, older turns summarised once the transcript gets long. Seeded history costs tokens and can have its own size limits, so plan for a fifteen-minute transcript, not a two-minute one.
3. **A short state note from the server**: this is an interview in progress, do not greet the candidate again, these questions are done, this is the next one.

The third layer is the one that is easy to skip, and it is the one that makes the seam invisible. The model does not have to infer where it is from the transcript, because the server, which knows, tells it.

## Close what you open

Rotation multiplies the number of streams per conversation, and every stream is capacity until it is closed. Leaks that were rare become routine.

I met an extreme version of this. A reconnect counter had a limit it could never reach, and one dead session kept reconnecting for more than 16 hours, holding capacity the whole time. The fix was the counter, but the lesson was broader: every conversation needs a hard maximum lifetime and a maximum number of reconnects, enforced in one place. A periodic check that compares open streams with live conversations is a cheap second line of defence.

## Text agents have the same problem

The Mandate Assistant, a text agent I built for recruiters, has the same structure. Past a token threshold it starts a fresh session seeded with a state snapshot and a shared brief, and the user barely notices, because nothing important lived only in the old conversation. I wrote about that in [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model). Voice just makes the seam audible, so it has to be smoother.

## Testing a fifteen-minute conversation

Nobody will sit through a fifteen-minute interview for every change, and a bug that appears at minute ten never shows up in a two-minute test. Three things help.

**Shrink the clock.** Make the limits configurable and set them to about a minute in tests. A five-minute test call then rotates several times, and the rotation path runs far more often than it does in production.

**Script the candidate.** Play recorded or synthesised answers into the session at each turn. The conversation becomes repeatable, so a change in behaviour points at a change in code.

**Soak at full length.** Before a release, run real-length conversations against a simulated candidate, ideally another model with a voice, and let them run past every limit.

Then assert on what the person would notice and what the system could leak:

- no greeting or recap after a rotation;
- no question asked twice, and the plan continues where it left off;
- the silence at each seam stays within the normal gap between turns;
- the transcript has no missing turns;
- the count of open streams is back to zero when the call ends.

That last check is cheap, and it is the kind that catches a zombie session in a test run instead of in production.

## Takeaways

1. **The server owns the conversation.** A model stream is a replaceable worker with a known lifetime.
2. **Rotate on your schedule, not the cap's.** Soft limit at a turn boundary, hard limit at the next pause, never during a tool call.
3. **Seed state, not just history.** A short note on where the conversation stands prevents the fresh-start greeting.
4. **Bound every session.** Maximum lifetime, maximum reconnects, and a sweep for anything left open.
5. **Test with a shrunken clock.** Make the rare path the common one in your test suite.
