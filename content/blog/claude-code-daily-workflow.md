---
title: "The Claude Code workflow I use every day"
description: "Plan mode, one branch per worktree, subagents for wide searches, skills for repeated work and hooks for rules that must never be skipped."
date: "2026-11-26"
id: 38
tags: ["Developer tools", "AI agents", "LLMs"]
---

Claude Code is easy to start with and easy to use badly. You can type a request, accept whatever comes back and ship it. That works until the codebase is large, the stakes are real and you are running three things at once.

This is the workflow I have settled into after a year of using it across ten repositories. None of it is clever. It is mostly structure that keeps the assistant fast and keeps me in control.

## Start every task with the goal, the limits and "done"

The quality of a session is decided in the first message. A good one has three parts:

- **The goal**, in terms of behaviour: "recruiters should see the client's latest reply on the mandate page", not "add a field".
- **The limits**: which repositories and files are in scope, what must not change, whether production data is off limits.
- **The definition of done**: which test should pass, what I will check in the browser or the logs.

It takes thirty seconds and saves a lot of course-correcting later.

## Plan mode for anything non-trivial

For anything bigger than a small fix, I switch to plan mode first (Shift+Tab cycles through the modes). In plan mode Claude reads and explores but does not edit. It comes back with a plan: which files, what changes, what could go wrong.

Then I argue with the plan. Wrong layer, missed edge case, a simpler approach, a file it should not touch. Changing a plan is cheap. Changing 600 lines of finished code is not, and by then the design decisions have been made for you. Only once I agree with the plan do I let it write.

## One branch per worktree

I often have more than one task in flight: a bug fix, a feature, a release. Running all of them in one checkout means branches switching under each other, half-finished changes leaking between tasks, and sessions overwriting each other's files.

Git worktrees fix this. Each task gets its own working directory on its own branch:

```bash
git worktree add ../app-fix-renewals -b fix/renewals origin/development
```

Each Claude session works in one worktree, and nothing it does can touch another task's files. When the branch is merged, the worktree is removed. The rule I follow is strict: one branch per worktree, never two.

## Subagents for wide searches

Some questions need a lot of reading. "Where is this field written, across five repositories?" "Which services consume this queue?" Answering them in the main session fills its context with file contents I will never need again.

So I hand that reading to a subagent. It does the searching in its own context and returns only the conclusion. The main session stays focused on the actual change. When several independent questions come up, several subagents can run at once.

Custom subagents can also live in `.claude/agents/` with their own instructions and tools, which is useful when the same kind of research comes up often.

## Skills for work I repeat

Anything I do more than a few times becomes a skill: a folder in `.claude/skills/` with a `SKILL.md` that describes the steps. A daily status check, a release checklist, a report in a fixed format. I invoke it with a slash command and get the same steps every time, including the boring checks I would otherwise skip at 7 pm.

The value is consistency more than speed. A skill does not forget step four.

## Hooks for rules that must never be skipped

Instructions in `CLAUDE.md` are guidance. Most of the time they are followed. For the few rules where "most of the time" is not good enough, I use hooks.

Hooks are commands that run on events, configured in `settings.json`: before a tool runs, after it runs, when a session stops. A hook before a shell command can refuse anything matching a dangerous pattern. A hook after a file edit can run the formatter. Because the hook runs outside the model, it cannot be talked out of it.

My rule of thumb: if breaking a rule once would be costly, it belongs in a hook, not only in a sentence.

## Permissions that match the machine

Approving every `git status` and `ls` is tiresome, so I allow the safe read-only commands explicitly. Everything that writes, deploys or touches a database still asks.

I never blanket-skip permissions on a machine whose environment holds production credentials. Mine does, because local runs use live configuration. On a machine like that, the permission prompt is the last line of defence, and it should stay.

## Connect tools carefully

MCP servers let Claude Code reach tools beyond the repository: an issue tracker, a chat workspace, a database. They are very useful and I connect them read-only wherever possible. An assistant that can read the incident channel is helpful. One that can post in it on its own is a different decision, and I make that one deliberately.

## Keep context clean

Long sessions drift. Old file contents and abandoned ideas crowd out what matters. Between unrelated tasks I clear the session. When a long task is still going, I compact it. If a session has clearly lost the thread, starting fresh with a short summary is faster than steering it back.

## Review in two passes

Before I review a change myself, I ask for a review in a fresh context, or with a review command, so the reviewer is not anchored on the reasoning that produced the code. It catches a surprising number of issues: a missing null check, a test that asserts the wrong thing, a stray edit in an unrelated file.

Then I review it myself, line by line in the risky areas: money, permissions, production writes, concurrency and anything that sends a message to a real person. The first pass catches the mechanical problems, which leaves my attention for the ones that need judgement.

## Takeaways

1. **Open with the goal, the limits and the definition of done.**
2. **Plan first** for anything non-trivial, and argue with the plan.
3. **One branch per worktree** so parallel tasks never collide.
4. **Send wide reading to subagents** and keep the main session focused.
5. **Turn repeated work into skills,** and put must-never-skip rules in hooks.
6. **Keep permissions and tools as narrow as the machine demands,** and review in two passes.
