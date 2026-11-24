---
title: "One product, three terms: rebuilding premium plans on Razorpay"
description: "What I learned collapsing a catalog of legacy premium plans into one Gold product with 1, 3 and 6 month terms, a free trial, attribution on every payment and webhooks you can trust."
date: "2026-11-24"
tags: ["Payments", "Razorpay", "Product engineering"]
---

A big part of my year at GoodSpace went into premium plans. Over a few months I rebuilt how members pay for Gold: the catalog, the trial, the checkout on web and in the app, where each payment came from, and the webhooks that keep renewals running.

Payments code is unforgiving. Every bug is either someone paying for something they did not get, or someone getting something they did not pay for. These are the decisions that mattered most.

## Plans are product, terms are billing

Premium had grown the way most catalogs grow: one plan at a time, each added for a good reason, until there were several overlapping plans that members found hard to compare and the team found hard to change.

The fix was to separate two ideas that had been tangled together. **Gold is the product.** One month, three months and six months are **terms**: different ways to pay for the same thing.

On Razorpay, every billing cycle is a Plan with its own period, interval and amount. So Gold is three Razorpay plans that all map to one internal product.

```js
const GOLD_TERMS = {
  "1M": { months: 1, razorpayPlanId: config.razorpay.gold1m },
  "3M": { months: 3, razorpayPlanId: config.razorpay.gold3m },
  "6M": { months: 6, razorpayPlanId: config.razorpay.gold6m },
};

const hasGold = (sub, now = Date.now()) =>
  sub.product === "GOLD" && sub.entitledUntil > now;
```

The rest of the codebase only ever asks the second question: does this member have Gold right now? Nothing outside billing needs to know which Razorpay plan id a member is on. That is what makes it possible to change terms or prices later without touching every feature that checks for premium.

## Retire plans, don't delete them

Legacy plans cannot simply disappear. Members are still on them, and their renewals and expiries still arrive as webhooks that reference the old plan ids.

So retiring a plan means three separate things:

1. **Stop selling it.** Every purchase path, on the web and in the mobile app, now offers Gold only.
2. **Keep resolving it.** Old plan ids still map to an entitlement, so webhooks for existing members are processed correctly.
3. **Let it end naturally.** Members keep what they paid for until their period runs out.

Doing all three at once, across web and app, was more coordination than code. Shipping the app release with the same plans and the same checkout data as the web was what made the switch clean.

## A trial is a state, not a flag

Gold has a 7-day free trial. The tempting implementation is a boolean on the user, `isTrial`, checked in a few places. It falls apart the moment someone cancels during the trial, converts, or comes back later.

Instead the trial is a state in the subscription state machine. Simplified, it looks like this:

| State | Has Gold | How you get there |
|---|---|---|
| `TRIALING` | Yes | The member claims the free trial |
| `ACTIVE` | Yes | A payment succeeds |
| `CANCELLED` | Yes, until the paid or trial period ends | The member cancels |
| `EXPIRED` | No | The period ends without renewal |

The important decision was that **cancelling during the trial keeps Gold until the trial ends**. Cutting someone off the moment they press cancel feels like punishment, and it creates a special case. With entitlement stored as a date, `entitledUntil`, cancellation is just a state change and every feature keeps working through the same `hasGold` check.

## Webhooks you can trust

Renewals arrive as webhooks, so the webhook handler is effectively the billing system. Three rules came out of the year.

**Verify the signature on the raw body.** Razorpay signs each webhook with HMAC SHA-256 using your webhook secret. Verify against the exact bytes you received, before parsing or trusting anything.

```js
import crypto from "node:crypto";

function verifyRazorpaySignature(rawBody, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature ?? "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

**Make idempotency part of the transaction.** Providers retry, so every event must be safe to process twice. But the record that says "already processed" has to commit together with the work it guards. I learned this one the hard way: a payment claim written outside the transaction once turned every failed renewal into one that could never be retried. I wrote about that bug in [One spread operator, every renewal](/blog/one-spread-every-renewal).

**Acknowledge only what is durable.** Returning success to the provider should mean the renewal is recorded and the entitlement extended. If anything failed, return an error and let the retry do its job.

## Know where every payment came from

A pricing page on the web, an upsell inside the product and a screen in the mobile app all lead to the same checkout. Without attribution, all you see is that a payment happened.

Every Razorpay checkout now records its source: the page, the surface and the device. That turns questions like "does the app convert better than the web?" from guesses into queries. If you are building this on Razorpay, the `notes` field on orders and subscriptions is a convenient place to carry it, because notes come back to you on the webhooks.

## The same building blocks for API plans

GOODex, our candidate search API, is sold to organisations rather than individuals, but it reuses the same ideas: subscriptions scoped to an organisation instead of a user, free-tier quotas, and credit accounting that is idempotent so a retried request is never charged twice.

## What I would tell someone starting

1. **Model product and terms separately.** Features check the product. Billing worries about terms.
2. **Store entitlement as a date.** Most edge cases, including cancellations and trials, become simple once "has premium" means "entitled until a time in the future".
3. **Never delete a plan that has members on it.** Stop selling it, keep resolving it, let it expire.
4. **Treat the webhook handler as the core of billing.** Verify, be idempotent inside the transaction, and acknowledge only durable work.
5. **Attribute every payment from day one.** It is cheap to add at checkout and impossible to reconstruct later.
