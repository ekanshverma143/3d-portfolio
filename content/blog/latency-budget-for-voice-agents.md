---
title: "Where the milliseconds go in a voice agent"
description: "A voice agent feels slow long before any one part looks slow. How to split the delay into capture, network, buffering, model and playback, and measure each."
date: "2026-10-21"
id: 3
tags: ["Realtime voice", "WebRTC", "Observability"]
---

People judge a voice agent by a number they never see: the gap between the moment they stop talking and the moment they hear a reply. Studies of human conversation put the typical gap between turns at around a fifth of a second. Few voice agents come close to that, and every extra stretch of silence gets noticed. An unpredictable one gets noticed most.

"It feels slow" is not a bug report. It is the sum of half a dozen delays that live in different places, belong to different owners and go wrong for different reasons. The only way to make it faster is to take it apart.

## The path of one turn

Follow one reply from the person's mouth, through your system, and back to their ear.

1. **Capture.** The microphone, the browser's audio processing (echo cancellation, noise suppression) and the encoder. WebRTC audio usually travels in 20 ms frames, so nothing leaves until at least one frame is full.
2. **Uplink.** The trip from the device to your server, plus any jitter on the way.
3. **Server buffering.** Whatever your code does before the audio reaches the model: chunking, queueing, resampling.
4. **End of turn.** The model, or your voice activity detector, deciding the person has finished. This waits for silence on purpose, and that wait is usually counted in hundreds of milliseconds.
5. **Model to first audio.** From the end-of-turn decision to the first bytes of reply audio.
6. **Downlink.** Your pacing, the network, and the jitter buffer on the client that smooths uneven arrival.
7. **Playback.** Decoding and the output device's own buffer.

Two kinds of cost hide in that list. Some are paid on every packet, and they are tiny. When I measured encoding in our AI interviewer, it took about 0.146 ms per 20 ms frame, roughly 1% of one CPU core. Others are paid once per turn, and those are where the time goes. Optimising the per-packet path is satisfying and rarely moves the number people feel.

## One timeline per turn

Measure each turn as a timeline, not as a single latency figure. Pick the events you can observe on the server and stamp each one against the same monotonic clock.

```js
// Simplified sketch: one timeline per turn, every mark on the same clock.
function startTurn(turnId) {
  const t0 = performance.now();
  const marks = {};
  return {
    mark(name) {
      marks[name] ??= Math.round(performance.now() - t0);
    },
    done(tags) {
      logger.info({ turnId, ...tags, ...marks }, "turn timeline");
    },
  };
}

// turn.mark("last_user_packet");   audio stops arriving
// turn.mark("end_of_turn");        the model decides the person is done
// turn.mark("first_model_audio");  first reply bytes from the model
// turn.mark("first_packet_sent");  first reply frame leaves the server
```

The gaps between marks are the stages. End of turn minus last user packet is endpointing. First model audio minus end of turn is the model's thinking time. First packet sent minus first model audio is your own buffering. That one is entirely yours, and it should be close to zero. If it is not, nothing else is worth tuning yet.

Do not compare timestamps across machines. A browser's clock and a server's clock can disagree by more than the gaps you are trying to measure. Compute durations on each side and send durations, never absolute times.

## The network and the client

The client half of the budget is the part most teams guess at, and WebRTC will tell you most of it. `getStats()` on the peer connection reports round-trip time on the active candidate pair, jitter and packet loss on the inbound audio, and how long audio waited in the jitter buffer. That last figure is cumulative, so divide it by the number of samples emitted to get an average.

Sample those every few seconds and log them next to the turn timelines. A growing jitter buffer is the client trading latency for smoothness on a bad network. That is often the right trade, but you should know when it is happening and for whom.

If audio still travels over a WebSocket, network trouble shows up differently: as stalls that look like model slowness. I covered that in [Why TCP breaks live speech](/blog/why-tcp-breaks-live-speech).

## Measure what the person hears

Server timelines tell you where time went inside your system. They cannot tell you what the person experienced. For that, record a test conversation the way the person hears it, with their microphone and the agent's audio mixed into one recording on the client. Then measure the silence between the end of their speech and the start of the reply straight from the waveform.

That number is the one that matches "it feels slow". Put it next to the server timeline for the same turns. The difference is capture, network and playback, and if it is large, you know to look outside the model.

Do this on test calls with test accounts. It is a measuring tool, not something to run on every real conversation.

## Pacing is not latency

One trap is to think that sending audio sooner makes the agent respond sooner. Models produce audio in bursts, and forwarding each burst as fast as it arrives looks efficient. A capture of our interviewer showed 11.8 seconds of audio sent in 7 seconds of wall time. The browser cannot play faster than real time, so the extra audio only piled up and caused glitches.

Pacing, one 20 ms frame every 20 ms on a clock that corrects for drift, fixed that without adding delay. The first frame of a reply still leaves the moment it is ready; pacing only stops you from running ahead of playback.

The opposite trap is a large buffer "to be safe". Every 100 ms of pre-buffer is 100 ms added to every reply. Let the client's jitter buffer absorb variation, because it adapts to the network. A fixed buffer in your own code does not.

## Percentiles and turn types

Averages hide the turns people remember. Track the median and the 95th percentile for each stage, and tag every turn with its kind: the first turn of a session, an ordinary turn, a turn after a tool call, a turn right after the server swapped model sessions. The slow tail usually belongs to one or two of those kinds, and each has a different fix.

A per-stage, per-kind view also settles arguments. When someone says the model got slower, the timeline either shows it in the model stage or it does not.

## Where to spend effort first

With the timeline in place, the order of work tends to pick itself:

- remove any buffering of your own that the timeline exposes;
- tune end-of-turn detection, because it is a large, deliberate wait and small changes are felt;
- look at the model stage per turn kind, especially after tool calls;
- only then look at the network, and mostly for the users on the worst connections.

## Takeaways

1. **Break "slow" into stages.** Capture, network, buffering, end of turn, model and playback each have their own owner and their own fix.
2. **Timestamp every turn on one clock.** Send durations across machines, never absolute times.
3. **Make your own buffering zero first.** It is the only stage that is entirely yours.
4. **Use `getStats()` for the client half.** Round-trip time, jitter, loss and jitter buffer delay are already measured for you.
5. **Measure the gap the person hears.** A mixed recording of a test call is the ground truth for everything else.
6. **Pace, do not burst.** Sending faster than real time moves the waiting; it does not remove it.
