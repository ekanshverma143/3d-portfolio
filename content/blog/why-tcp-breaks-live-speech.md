---
title: "Why TCP breaks live speech"
description: "What I learned moving a realtime AI voice interviewer from socket.io over TCP to a WebRTC media track, and the bugs that only showed up once I measured the audio."
date: "2026-11-24"
tags: ["WebRTC", "Realtime voice", "Node.js"]
---

At GoodSpace, candidates can take a video interview with an AI interviewer that listens and speaks in real time. The model behind it is Amazon Nova Sonic, a speech-to-speech model: audio goes in, audio comes out, with no separate transcription and text-to-speech steps in between.

The first version carried audio between the browser and our server over socket.io. On a good connection it felt fine. On the networks candidates actually use, home Wi-Fi with a microwave nearby and phones on 4G, it fell apart in ways that were hard to describe and harder to reproduce. The interviewer would freeze for a few seconds and then rush. Sometimes one sentence played as two overlapping voices. Clear English came back transcribed as Hindi. And somewhere around the eight minute mark, the interviewer would lose the thread.

Rebuilding it on WebRTC fixed most of that, but the move itself taught me less than the bugs I found once I stopped listening and started measuring.

## TCP is the wrong shape for speech

socket.io runs over WebSockets, which run over TCP. TCP promises that every byte arrives, in order. For a file download that is exactly what you want. For live speech it is a trap.

When one packet is lost, TCP holds back everything behind it until the missing packet is retransmitted. This is head-of-line blocking. A loss that lasts a few milliseconds turns into a stall of a second or more, and then all the queued audio arrives at once. To the listener, the voice freezes and then races to catch up.

Speech does not need every packet. If 20 ms of audio goes missing, the right move is to skip it and keep going. Nobody notices a 20 ms gap. Everybody notices a two-second freeze.

A WebRTC media track is built around that idea. Audio travels as RTP over UDP, losses become small holes, and the browser brings a lot of machinery for free: echo cancellation so the interviewer does not hear itself through the candidate's speakers, a jitter buffer that smooths uneven arrival, and NACKs to request a retransmission only when there is still time to use it.

On the server I used werift, a WebRTC implementation for Node.js, so the media path could live next to the rest of the interview logic.

## Measure the audio, not your impression of it

The move to WebRTC removed the stalls. It did not remove the strange bugs. Those only gave way when I started capturing the actual audio and session stats and reading them like logs.

**Audio sent faster than real time.** One capture showed the server sending 11.8 seconds of audio in 7 seconds of wall time. The model produces audio in bursts, and the server was forwarding each burst as soon as it arrived. The browser's buffer cannot absorb that, so playback glitched. The fix is to pace RTP: one 20 ms frame every 20 ms, on a schedule that corrects for drift so small timer errors do not pile up over a fifteen-minute interview.

```js
const FRAME_MS = 20;
let next = performance.now();

function tick() {
  const frame = queue.shift();
  if (frame) track.writeRtp(packetize(frame));
  next += FRAME_MS;
  setTimeout(tick, Math.max(0, next - performance.now()));
}
```

Scheduling against `next` rather than "20 ms from now" is what keeps the clock honest. A plain `setTimeout(tick, 20)` drifts later on every frame.

**One sentence, two voices.** Audio for a single utterance could reach the browser over two paths and play twice, slightly offset. Each utterance now latches to one transport for its whole duration.

**English heard as Hindi.** When a candidate talks over the interviewer, which is called barge-in, the first fragment of their speech could be clipped and mis-detected as another language. A short hangover after barge-in, holding the state for a moment before acting, fixed it.

## Outliving the stream cap

The speech model's streams have a limit of roughly eight minutes. Interviews run fifteen. That explained the interviewer losing the thread: the stream ended and a new one began with no memory.

Now the server rotates streams deliberately, at a turn boundary, before the cap. The new stream is seeded with the conversation so far, so the candidate never hears the interviewer start over. Rotating between turns, not mid-sentence, is what makes the seam invisible.

## Give back what you hold

The last bug was not about sound at all. A reconnect counter had a limit it could never reach. One dead phone session kept reconnecting every 58 seconds for more than 16 hours, and every one of those reconnects held an interview slot. Fixing the counter gave that capacity back.

## Cost

I was worried that encoding audio in Node.js would be the bottleneck. It was not. Encoding takes about 0.15 ms per 20 ms frame, roughly 1% of one CPU core. The expensive part of realtime voice is the model, not the media path.

## What I would tell someone starting

1. **Use a media transport for media.** If you are pushing live audio through a WebSocket, you will meet head-of-line blocking sooner or later.
2. **Pace what you send.** Real time means one frame per frame duration, on a clock that corrects for drift.
3. **Capture and measure.** Most of these bugs sounded like "it feels glitchy". Every one of them was obvious in a capture.
4. **Design for the model's limits.** Stream caps, turn boundaries and context carry-over are product decisions, not edge cases.
