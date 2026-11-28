---
title: "Writing a CLAUDE.md that actually changes behaviour"
description: "Most CLAUDE.md files are long, vague and ignored. What to put in yours so Claude Code stops repeating the same mistakes in your codebase."
date: "2026-11-27"
id: 39
tags: ["Developer tools", "LLMs", "AI agents"]
---

Claude Code reads a file called `CLAUDE.md` at the start of every session. It is the closest thing you have to onboarding notes for a very fast new teammate who forgets everything overnight.

There are a few layers. A `CLAUDE.md` in the project root is checked in and shared with everyone on the repository. A personal one in `~/.claude/CLAUDE.md` applies to every project on your machine. Running `/init` gives you a starter file generated from the codebase.

The starter is a fine beginning. But most `CLAUDE.md` files I have seen, including my early ones, fail in the same way: they are long, vague and full of advice nobody would act on. "Write clean, maintainable code." "Follow best practices." These lines cost context and change nothing.

A good `CLAUDE.md` is different. It is short, specific, and every line exists because something went wrong without it.

## Write down what cost you time

The best source of content is your own mistakes, and the assistant's. Every time Claude does something that wastes an hour, ask: what one sentence would have prevented this?

In my work, lines like these have earned their place:

- "Mongoose is strict by default. A `$set` on a field the schema does not declare is dropped silently. If a write seems to work but the field is missing, check the schema first."
- "`console.log` never reaches the log pipeline; only the structured logger does. Missing log lines prove nothing on a `console.log` path."
- "Scripts must connect to the database explicitly. Without it, queries buffer and time out after 10 seconds with an error that looks like a network problem."

Each of these is a trap that looks like something else. That is exactly the kind of knowledge a new teammate lacks, and exactly what a `CLAUDE.md` is for.

## Give every hard rule a reason

Rules without reasons get applied too literally or not at all. Rules with reasons generalise.

Compare:

```text
Do not start dev servers.
```

with:

```text
Do not start a local dev server unless I ask for it in that moment.
Why: this laptop has 7.4 GB of RAM. A dev server plus parallel test runs
has crashed it before. Verify on the deployed environment instead.
```

The second version tells Claude what to do instead, and lets it handle cases the rule did not list, such as a heavy build or a multi-worker test run, because it understands what the rule protects.

I also mark how much a rule matters. A few are labelled HARD: never write to production data without asking, never skip a specific sync step before a merge. The rest are preferences. If every line is in capital letters, nothing stands out, so keep the HARD label rare.

## Say how to do the routine things

Claude spends a surprising amount of effort working out commands. Save it the trouble:

- how to run one test file, not the whole suite,
- how to start the app with the right environment,
- which branch to read when the working tree may be stale,
- where generated or vendored files live, so they are never edited by hand.

These lines are boring and they pay for themselves on day one.

## Keep it short and layered

Everything in `CLAUDE.md` is loaded into every session, so every line has a cost. Keep the root file to what matters on almost every task, and move detail into separate files it points to.

My own setup is layered. A short root file holds the hard rules and the most expensive gotchas. Topic notes hold the details for specific areas, and an index file lists them one line each, so the right note gets opened only when a task needs it. One rule in the root file says to read a generated map of each repository before touching it. That map does more for orientation than any paragraph I could write.

## Treat memory like code

Claude Code can also keep memory across sessions: notes it writes and reads back later. Memory is powerful and it rots, just like code.

What has worked for me:

- **One fact per note.** A note that mixes five things cannot be updated cleanly.
- **Say why and how to apply it.** "Never use the data provider's account directly. Why: it costs credits per lookup. How to apply: use the sanctioned pipeline and ask before any paid step."
- **Convert relative dates.** "Last week" means nothing a month later. Write the actual date.
- **Delete what turned out to be wrong.** A stale memory is worse than none, because it is believed.

## Test your rules

A `CLAUDE.md` is a set of hypotheses about what will change behaviour. Test them.

When Claude repeats a mistake, add one line and watch whether the next session avoids it. When a line has never mattered in months, delete it. Every so often, read the whole file looking for contradictions, rules for problems that no longer exist, and instructions written for older models that are now unnecessary or even harmful.

## What never goes in

- **Secrets.** No keys, tokens or passwords. Say where credentials live, never what they are.
- **Things the code already says.** Do not restate the folder structure line by line. Claude can read it.
- **Wishes.** "Be careful" is not an instruction. "Ask before running any command that writes to production" is.

## A small example

```markdown
## Hard rules
- HARD: Never write to production data without asking first. Reading is fine.
  Local runs use live credentials, so treat every write as a production write.
- HARD: Run the agent sync dry run before merging any change to an agent
  definition, and paste its output in the pull request.

## Gotchas that cost real time
- The ORM drops undeclared fields silently on update. Check the schema first.
- Only the structured logger reaches the log pipeline, not console.log.

## Commands
- One test file: `node --test test/<file>.test.js`
- Read `origin/development` for current code; the working tree may be stale.
```

Short, specific, and every line traceable to a real hour lost.

## Takeaways

1. **Every line should prevent a specific mistake.** Delete generic advice.
2. **Give hard rules a reason** and say what to do instead.
3. **Keep the root file short** and put detail in linked notes.
4. **Treat memory like code:** one fact per note, with why, and prune what is wrong.
5. **Test your rules** by watching behaviour change, and remove the ones that never matter.
6. **Never put secrets in it.**
