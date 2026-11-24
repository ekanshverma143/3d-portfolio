---
title: "Kill switches and dry runs: shipping AI features you can turn off"
description: "Before an AI feature writes anything real, it should stop when told and show you what it would have done. The ladder I use to go from dry run to live."
date: "2026-11-10"
tags: ["AI agents", "Product engineering", "Observability"]
---

For any feature that acts on its own, the first thing I build is the way to stop it. The second is a way to run it without it doing anything.

That sounds backwards: brakes before the engine. But with AI features you do not really know how a system will behave until it meets real data, and by then you want two things in place. An off switch that works in seconds, and a record of what the system would have done before it was allowed to do it.

## A kill switch is a runtime check, not a deploy

A kill switch is a flag the code reads at the moment it is about to act. Flipping it must not need a build, a deploy or a restart. If turning a feature off takes a full pipeline run, it is not a kill switch. It is a rollback.

A few details decide whether it actually works:

- **Check at the point of action,** not only when a job starts. A long run that read the flag once, at the beginning, carries on after you flip it.
- **Fail closed.** If the flag cannot be read, the feature does not run.
- **One switch per feature,** so you can stop the part that misbehaves without stopping everything around it.
- **Stop cleanly.** Work in flight should end in a known state, not halfway through a write.

The lead router I built at GoodSpace has one. Every 10 minutes during office hours it assigns new leads to sales reps, only to reps who are in the office, gives a rep 2 working hours to accept, and tries up to 3 reps. That is a lot of automatic decisions about people's workload. Being able to stop it is the condition for running it at all.

GoodSpace Autopilot, which works through job applications for members one step at a time, has a kill switch too.

## Dry run: same code, no side effects

A dry run executes the whole feature and stops at the last moment. It makes every decision, records it and writes nothing.

The trap is building the dry run as a separate code path. Then it tests a different program from the one that will run live. The structure that avoids this is to split every action into a plan and an apply. Planning reads data and decides. Applying is the only place a write happens. A dry run plans and logs; a live run plans, logs and applies.

```js
// Simplified sketch
async function tick({ mode }) {
  if (!(await flags.enabled("router"))) return;

  const plan = await planAssignments(); // reads and decides, never writes
  for (const step of plan) {
    log.info({ step, mode }, mode === "live" ? "assigning" : "would assign");
    if (mode === "live") await applyAssignment(step);
  }
}
```

The router has a dry-run mode next to its kill switch, so its decisions can be read before any lead actually moves.

For one-off scripts, dry run should be the default. The script that recovered our admin audit trail from the MongoDB oplog is dry-run by default: run it with no flags and it reports what it would write. Writing needs an explicit flag, so the dangerous mode is the one you have to ask for.

That script follows two more rules worth copying. It is idempotent: run it twice and the second run changes nothing. And where it could not know something, it did not guess. New values and times came straight from the oplog, old values were reconstructed by walking changes oldest first, and the actor was left null rather than guessed. A backfill that guesses produces data that looks authoritative and is not.

## Report-only before live writes

Dry-run output is for engineers. Between that and live there is a useful middle step: report-only, where the system's decisions go to the people who would otherwise make them, while they keep doing the work by hand.

Say you are automating lead assignment. For a week, the system posts "I would give this lead to this rep" while managers assign as usual. Comparing the two tells you more than any test: where the rules disagree with people, and whether the people or the rules are right. It also builds the trust you will need on the day you switch it on.

## Caps: autonomy in measured amounts

Switching a feature on should not be a single jump from off to fully on. Caps let you turn it up in steps.

**Step caps.** The Mandate Assistant has an autopilot mode that clears approval cards on its own, with a hard cap on steps per run. A loop that misreads its goal stops after a bounded number of actions and hands back to a person, instead of running until someone notices.

**Scope caps.** Limit who or what the feature applies to: one team, a handful of accounts, a slice of traffic. Widen it when the record says you can.

**Rate caps.** A daily budget or a concurrency limit. The lead qualification agent runs on a queue at concurrency 1 with a daily research budget, so even a bad day has a ceiling.

When a cap is hit, the right behaviour is to stop and report, not to retry harder.

## Make the end of every run legible

A feature you might need to stop has to be easy to read. Autopilot gives every run a typed outcome, one of a fixed set of named results rather than free text, so you can count how runs end and spot a new failure mode early. A sweeper finds runs that have gone stale and closes them, so a crash mid-step does not leave work in limbo.

Retries need the same care as writes. In Autopilot, retrying a step reopens the steps that depend on it and voids approvals given for the old result. An approval is consent to a specific thing. When the thing changes, the consent should not carry over.

## The ladder

Put together, the path from idea to autonomy looks like this:

1. **Off,** behind a kill switch that works before anything else does.
2. **Dry run:** decisions logged, nothing written.
3. **Report-only:** decisions shown to the people doing the job.
4. **Live with tight caps:** few steps, small scope, low rate.
5. **Wider caps,** one at a time, as the record earns it.

The Mandate Assistant climbed a similar ladder: approval cards first, then autopilot with a step cap, then a headless driver that approves only safe cards and stops at sign-off gates. [Give your agent your permissions, not more](/blog/agent-permissions-not-more) covers that path in more detail.

## Takeaways

- Build the off switch first, and make it a runtime check at the point of action.
- Split plan from apply, so the dry run tests the real code.
- Default scripts to dry run, make them idempotent, and never let a backfill guess.
- Show decisions to people before letting the system make them.
- Raise autonomy with caps you widen one at a time, and stop at a cap instead of retrying.
- Void approvals when the thing that was approved changes.
