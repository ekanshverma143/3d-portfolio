---
title: "How to use Claude in development without losing your edge"
description: "Claude can write most of your code. Here is how to use it so you get faster and better as an engineer, instead of slowly forgetting how to do the job."
date: "2026-11-28"
tags: ["Developer tools", "LLMs", "Product engineering"]
---

Most of the code I shipped this year was written with Claude. Across about 2,300 merged pull requests, the commit history says so plainly: Claude is listed as a co-author on most of them.

A fair question follows from that, and I ask it of myself: am I getting better as an engineer, or just faster at producing code I understand less and less?

I think you can have both speed and growth, but not by accident. An assistant removes friction, and friction is where a lot of learning used to happen. Reading the stack trace, holding the system in your head, writing the query by hand. If you stop doing all of those, the skills fade. So the trick is to choose which friction to keep.

I wrote earlier about [what I hand to an AI coding assistant and what I keep](/blog/shipping-with-an-ai-coding-assistant). This post is about the other half: how to use Claude so that you keep growing.

## Understand before you accept

The single rule that does most of the work: **if you cannot explain the diff without looking at the conversation that produced it, it is not ready to merge.**

This sounds strict. In practice it is quick. For most changes the explanation is one sentence. When it is not, that is the signal. Either the change is too big, or there is something in it you do not understand yet, and that something is exactly what you should learn before it reaches production.

When Claude writes code in an area I do not know well, I ask it to explain the approach, then I explain it back in my own words and ask what I got wrong. It takes two minutes and it is the difference between owning the code and hosting it.

## Think first, then ask

The fastest way to lose your debugging skill is to paste every error into the chat the moment it appears.

A better habit: before asking, write down your own hypothesis. One line is enough. "I think the retry is running outside the transaction." Then ask Claude, and compare.

When you were right, you got confirmation and a faster fix. When you were wrong, the gap between your guess and the real cause is the most valuable thing in the whole exchange. That gap is your mental model being corrected, and it only gets corrected if you had a guess to begin with.

## Use it as a tutor, not a vending machine

The same model can hand you an answer or teach you how to find one. The difference is in how you ask.

Prompts that build skill look like this:

- "Explain why this race condition happens. Do not fix it yet."
- "What would break if I moved this call outside the transaction?"
- "Give me three ways to design this, with the trade-offs of each."
- "Review my approach before you write any code. What am I missing?"
- "Show me how you would find this bug yourself, step by step."

Prompts that skip the learning look like "fix this" and "make the test pass". Both are fine when you already understand the problem. They are a trap when you do not.

## Own the design, delegate the typing

The part of the job that is worth the most is deciding what the system should be: the boundaries between parts, the data model, what happens when a dependency fails, what must never happen. That is also the part an assistant is least able to own, because it lacks the context only you have.

So I keep design decisions for myself and let Claude implement inside them. For anything non-trivial I ask for a plan first, read it critically, change it, and only then let it write code. Arguing with a plan is cheap. Arguing with 600 lines of finished code is expensive, and by then the design decisions have already been made for you.

## Keep the fundamentals warm

Some skills you will use rarely but need badly when you do. Keep them in practice on purpose.

**Write the important queries yourself.** SQL is where subtle bugs hide: a join that drops rows, an index that is not used. Write the query, then ask Claude to review it, not the other way round.

**Read the docs for the things you depend on.** When I moved a voice interviewer onto WebRTC, what taught me the most was not any answer I was given. It was capturing the audio and reading what was actually on the wire. I wrote about that in [Why TCP breaks live speech](/blog/why-tcp-breaks-live-speech). Measurement and primary sources build an intuition that summaries cannot.

**Build something small without help now and then.** A weekend script, a kata, a tiny tool. Not as a purity test, just to check that the muscles still work. If it feels much harder than it used to, that is useful information.

## Ask for evidence, not reassurance

Claude saying "this should work now" is an opinion. A test that fails before the change and passes after it is evidence. So is real output from the real code path.

Getting into the habit of asking for evidence does two things. It catches the plausible-but-wrong answers, which are the dangerous kind. And it keeps you in the role of the engineer who verifies, which is the role that keeps you sharp.

## Write it down

Explaining something in writing is the fastest way to discover you did not fully understand it. Half of the posts on this blog started as "I think I know how this works" and turned into "I had better check".

You do not need a blog. A short note at the end of a hard task works: what broke, why, and what you would do differently. Over a year, those notes become a record of what you actually learned, as opposed to what you merely shipped.

## Signs you are losing your edge

Watch for these in yourself:

- You cannot start debugging without the assistant open.
- You merge diffs you have only skimmed, because they "look right".
- You cannot estimate how long something will take, because you no longer know what is involved.
- You cannot explain how your own system works without opening the code.
- Every design decision feels like the assistant's, not yours.

None of these mean you should stop using Claude. They mean you have delegated a part of the job you still need to own.

## What it made me better at

Used this way, the assistant has made me a better engineer in specific ways. I read unfamiliar code much faster, because I can ask questions of it. I explore more designs before choosing one, because trying an idea is cheap. I write more tests, because the tedious part is gone. And I ship smaller pull requests, because asking for one focused change is easier than writing a large one by hand.

The skill that matters most has shifted from typing code to judging it. That skill only grows if you keep exercising it.

## Takeaways

1. **Explain every diff without the chat.** If you cannot, it is not ready.
2. **Write your hypothesis before you ask.** The gap between your guess and the answer is where you learn.
3. **Ask for explanations and trade-offs, not just fixes,** whenever the problem is new to you.
4. **Keep design decisions for yourself.** Ask for a plan, critique it, then let Claude implement.
5. **Practise the fundamentals on purpose:** write important queries, read primary sources, build small things unaided.
6. **Ask for evidence** in the form of tests and real output, never just reassurance.
