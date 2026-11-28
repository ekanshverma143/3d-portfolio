---
title: "From recorded meeting to client-ready report"
description: "Recording bots, transcripts, a queue with retry and dedupe, regional failover when the model is throttled, and a PDF a client can trust. Building AI meeting reports."
date: "2026-11-23"
id: 36
tags: ["LLMs", "Node.js", "Product engineering"]
---

At GoodSpace, meetings and interviews are scheduled on Google Meet, a recording bot joins them, and afterwards an AI writes a report. For interviews, Claude writes a report for the client from the transcript, delivered as a PDF.

On a whiteboard that is one model call. In production it is a chain of slow steps owned by different systems, any of which can fail on a given day, and the model call is the easiest link. This is how I think about building that chain so that reports arrive, arrive once, and can be trusted.

## The stages

1. **Schedule.** Create the meeting and its link, and schedule a bot to join it.
2. **Record.** The bot joins, is admitted, records and leaves.
3. **Transcribe.** Turn the recording into text with speakers.
4. **Store.** Save the transcript durably.
5. **Generate.** Write the report on a queue.
6. **Render and deliver.** Turn it into something a person reads.

Each stage fails differently. The bot waits in the lobby and nobody admits it. The meeting moves to another time. Nobody shows up. The transcript arrives late. The model is throttled. Treating all of these as "report failed" makes every one of them hard to fix.

## Give the bot a state machine

The recording bot should have typed states with timestamps: scheduled, joining, waiting to be admitted, recording, finished, and failed with a reason. A meeting nobody attended should end as a no-show, not as an error.

When someone asks where a report is, the answer should be a state, not a guess. "The bot was never admitted" and "the model was busy, retrying" lead to very different conversations.

## Store the transcript first

The transcript is the one artifact you cannot recreate. The meeting will not happen again. Everything after it, the report, the PDF and the notification, is derived and can be produced again.

So store the transcript durably the moment it arrives, before anything clever happens. That one ordering decision is what makes the rest of the pipeline able to heal itself. A failed report is no longer a lost meeting; it is a job to run again. A periodic sweep can look for meetings that have a stored transcript and no report, and queue them. And when the report prompt improves, older meetings can be regenerated from what is already stored.

## A queue with retry and dedupe

Report generation runs on a BullMQ queue with retries and deduplication. Both exist because the triggers are messy.

Events from a recording service can arrive more than once. A user can press "regenerate" twice. A sweep can queue a meeting that a webhook queued a minute earlier. If each of those produced a report, the client would get two slightly different documents and trust both less.

The simplest dedupe is a deterministic job id built from the meeting and the report type. BullMQ will not add a job whose id already exists, so repeated triggers collapse into one job. That only holds while the earlier job is still stored, so the worker should also check whether the report already exists before doing any work. Dedupe at the door, stay idempotent inside.

Retries need a distinction. Throttling, timeouts and a transcript that is not ready yet are worth retrying with backoff. An empty transcript is not; it will still be empty on the fifth attempt. BullMQ lets a worker throw an `UnrecoverableError` to fail a job without spending its remaining attempts, which keeps the failed list honest.

## When the model is throttled, move

The reports are generated through Amazon Bedrock, and under load a region can throttle requests. Reports are not latency sensitive, so the tempting fix is to back off and retry. But throttling can last, the queue backs up behind it, and retrying the same region adds load exactly where there is too much already.

So generation fails over to another region on throttling. The shape that works is two loops, kept separate. The inner loop hops regions immediately on a throttle and on nothing else. The outer loop is the queue's own retry with backoff, which takes over when every region is busy.

```js
// Simplified sketch: hop regions on throttling; let the queue retry everything else.
async function generateReport(input) {
  for (const region of REGIONS) {
    try {
      return await invokeModel(clients[region], input);
    } catch (err) {
      if (err.name !== "ThrottlingException") throw err;
    }
  }
  throw new Error("Throttled in every region"); // the queue backs off and retries
}
```

A validation error will fail the same way in every region, so it should not hop. And the region list is a policy decision before it is an engineering one: include only regions where the model is available and where you are allowed to process that data.

## Writing for a client

A report for a client is a different product from notes for the team. The client reads it as your judgement of a candidate, and a few rules follow from that.

**Expect a messy transcript.** Speech recognition stumbles on names, company names and technical terms, speaker labels slip, and people talk over each other. Give the model the context it needs to read through that: the role, the candidate's name, who the interviewer was.

**Ground every assessment.** Each strength or concern should point at something actually said in the interview. A claim with no support in the transcript gets dropped, however reasonable it sounds.

**Let the model write content and the code do layout.** Ask for structured output, such as a summary, strengths, concerns and notes per question, then render it through a fixed template. Every report looks the same, the layout never breaks, and each field can be checked before the PDF exists.

**Refuse thin input.** If the bot recorded an empty room or a meeting that ended after two minutes, do not let the model pad a report out of nothing. Mark it as too little to report on and tell a person.

This is the same idea as [Never let the model read facts from prose](/blog/never-let-the-model-read-facts-from-prose), applied to output: the model writes only from what the source actually contains.

## Takeaways

1. **Store the irreplaceable thing first.** With the transcript safe, every later failure is a retry.
2. **Type every state and every failure.** "Report failed" is not a diagnosis.
3. **Dedupe at the door, stay idempotent inside.** Deterministic job ids plus a check in the worker.
4. **Separate throttling from failure.** Hop regions on a throttle, back off on everything else, and give up on what will never succeed.
5. **For client-facing output, the model writes and the template formats.** Ground every claim in the transcript and refuse to pad.
