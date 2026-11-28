---
title: "What breaks when an AI makes phone calls"
description: "Answering machines, phones that screen unknown callers, a model wandering between phases and lenient grading. Lessons from production transcripts of AI screening calls."
date: "2026-10-25"
id: 7
tags: ["Realtime voice", "AI agents", "Evals"]
---

At GoodSpace an AI agent phones candidates for a first screening: it tells them about the role and asks the role's must-have questions. In September I worked on making those calls better, and the evidence for every fix came from one place: production transcripts.

Not test calls, and not the demo I could run at my desk. A phone call is the least controlled place an agent will ever work. The line is noisy, the person is busy, and sometimes the thing that answers is not a person at all.

## Read transcripts before you touch the prompt

The temptation with a misbehaving agent is to open the prompt and add a sentence about the last bad call you heard. That fixes one call and quietly breaks two others.

Reading transcripts in bulk works better. Write down in a few words what went wrong in each one, group the notes, and work on the biggest group first. The groups are rarely what you expect, and many of them are not prompt problems. Some are telephony, some are data, and some are the shape of the conversation itself. Each section below is one of those kinds of problem.

## Answering machines

The call connects and something starts talking. It might be a voicemail greeting, a carrier message saying the number cannot be reached, or a mailbox that is full.

An agent that treats "connected" as "the candidate is on the line" will greet the voicemail, ask its first screening question to a beep, and can leave a long one-sided interview in someone's mailbox. The damage does not stop at the call. The record now says the call completed and the candidate answered nothing, which looks like an uninterested candidate rather than one who was never reached.

The handling that works has three parts. Decide early who is on the line, using both the telephony provider's answering machine detection, where you have it, and cues in the transcript such as "leave a message after the tone". When it is a machine, leave one short message or hang up. And record the outcome as its own type, so retries treat it as "not reached" instead of "not interested".

## Phones that answer for their owner

A newer case: phones that screen unknown callers. Recent iPhones can answer a call from an unknown number themselves, ask the caller for their name and the reason for the call, and then ring the owner with a transcript of the answer so they can decide whether to pick up. Some Android phones have offered something similar for years.

To an AI agent this sounds like a polite person asking a question, so it answers the way it answers people: it starts the conversation. Now the phone's assistant is being asked screening questions, and the owner is reading the agent's words on screen while deciding whether to answer.

That makes the agent's first sentence the most important one in the call. When the agent recognises a screening prompt, it should reply the way a sensible human caller would: who is calling, from which company and why, in one short sentence. Then it should wait quietly for the person and start from the greeting once they arrive.

## Who decides what happens next

The first instinct with a call agent is to give the model the whole script and let it run. The model decides when the introduction is over, when screening starts, which questions it has asked and when to wrap up.

Models are good at conversation and poor at bookkeeping, so this goes wrong in predictable ways. A must-have question gets skipped because the conversation wandered. Another gets asked twice. The call ends before the questions are done, or screening starts before the agent has confirmed it is speaking to the right person at a good time.

I moved the screening phase under server control. The pattern is a split of responsibilities: the server owns the structure of the call, and the model owns the wording.

```js
// Simplified sketch: the server decides what comes next, the model decides how to say it.
function nextInstruction(call) {
  if (call.phase === "screening") {
    const question = call.mustHaves.find((q) => !q.asked);
    if (question) return { phase: "screening", ask: question.text };
    call.phase = "wrap_up";
  }
  return { phase: call.phase };
}
```

The model sees the current phase and only what it needs for it. The server moves to the next phase when the current one is done, and decides when the call may end. The model still does what it is good at: phrasing a question naturally, following up on a muddled answer, and coping with the person who says something unexpected.

A side effect is better data. Once the server tracks phases, every call can record the phase it reached, so "voicemail", "wrong person", "call back later" and "screened" become separate outcomes instead of one pile of transcripts.

## Facts the model must not invent

When the agent talks about the role, where it is, whether it is on site, what it requires, it has to speak from facts. Those facts now come only from structured columns, never from the free-text job description. A join bug once left them empty and the model improvised, which taught me as much as anything else on this list. That story has its own post: [Never let the model read facts from prose](/blog/never-let-the-model-read-facts-from-prose).

## Grade must-haves strictly

A must-have is a requirement the employer will not bend on: say, a particular certification, or being able to work on site five days a week. People rarely answer these with a clean yes or no. They say "I can manage", "mostly", "I am getting it renewed". A friendly model, left to itself, grades those as yes, and the recruiter gets a shortlist that falls apart on the first human call.

Strict grading, the way I think about it, means:

- three outcomes, not two: met, not met and unclear. A hedge or a condition is unclear, never met;
- "not asked" is its own state and never counts as a pass;
- every verdict carries the line from the transcript that supports it;
- an unclear answer earns one follow-up in the call, asking for a direct answer, before the agent moves on.

The grade has consequences downstream. In our candidate ranking, a failed must-have zeroes the fit score, however good the rest of the profile looks. That only works if "failed" means failed, and not "the model was in a generous mood".

## Typed outcomes for everything

Every section above ends the same way: a new outcome type. Voicemail, screening assistant, wrong person, call back, screened, must-have not met, must-have unclear. That is not a coincidence. A call agent that reports only "completed" or "failed" hides every one of these problems inside a transcript that somebody has to read. Typed outcomes turn them into counts you can watch, and into retry rules that do the right thing without a person in the loop.

## Takeaways

1. **Start from production transcripts.** Group the failures before you change anything, and expect many of them not to be prompt problems.
2. **Decide who is on the line before you start.** Answering machines and screening assistants need their own handling and their own outcome types.
3. **Let the server own the structure.** Phases and question order are bookkeeping; the model should handle the wording.
4. **Grade must-haves with three states and evidence.** Lenient grading moves the failure to a recruiter's phone, where it costs more.
