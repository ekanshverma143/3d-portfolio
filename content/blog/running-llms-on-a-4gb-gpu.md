---
title: "Running a local LLM on a 4 GB GPU"
description: "Notes from Jarvis, my early-stage local assistant: choosing a quantised model that fits 4 GB of VRAM, one-click setup, swappable backends and a bench command."
date: "2026-10-23"
tags: ["Local LLMs", "LLMs", "Developer tools"]
---

Jarvis is a side project: a local, always-on assistant running on my laptop, whose GPU has 4 GB of memory. The idea is an assistant that works offline, keeps what I say on my own machine and costs nothing per message.

It is early stage. Today it is a chat in the terminal. Most of the work so far has gone into the unglamorous base: a model that fits, setup that can be repeated, and numbers instead of impressions.

## The budget is memory, not compute

On a small GPU the first question is not "which model is best?" but "which model fits?". If the weights and working memory do not fit in video memory, the runtime offloads some layers to the CPU, and generation slows down sharply. A slightly weaker model that sits entirely on the GPU usually beats a stronger one split across both.

The arithmetic fits in your head. Weights take roughly parameters times bits per weight, divided by eight:

- a 4 billion parameter model at 16-bit precision: about 8 GB. It does not fit.
- the same model quantised to about 4 bits: around 2.5 GB. It fits, with room left over.
- a 7 or 8 billion parameter model at 4 bits: roughly 4 to 5 GB of weights alone. It does not fit.

Formats sold as 4-bit usually spend a little more than 4 bits per weight once scales are included, so real files run a little larger.

Then there is everything that is not weights. The runtime takes its own slice. The KV cache, which stores attention state for every token in the context, grows linearly with context length. On 4 GB, context length is the dial you actually turn, and a long context quietly pushes layers off the GPU. Set it explicitly instead of trusting a default.

## Picking the model

The default is Qwen3 4B, quantised, with Llama 3.2 3B as the fallback. Both run through Ollama.

Why that pair:

- **4B is about the ceiling for this card.** It leaves room for a useful context window and the runtime's overhead.
- **The fallback is smaller and from a different family.** A 3B model has more headroom when memory is tight, and a different family fails in different ways. If the default struggles with some kind of prompt, the fallback is a real alternative, not the same weakness at a smaller size.
- **Ollama handles the plumbing.** It pulls quantised builds, places them on the GPU when they fit and serves a local HTTP API. The rest of Jarvis talks to a local server and never links against a model runtime.

Qwen3 can also reason step by step before it answers. That helps on harder prompts, but on a small GPU every token of reasoning is time spent waiting. For a conversational assistant it is worth measuring with that mode on and off rather than assuming either way.

## One-click setup

A local model project is mostly environment: a Python version, a package manager, the model runtime, the weights, and GPU drivers. Each one can break after an update.

So Jarvis has a one-click bootstrap. It installs uv, Python, Ollama and the model. A bootstrap like this should be safe to run twice, skipping anything already in place, because the second run is usually the one that finishes a half-done first.

Next to it is a `doctor` command. Its job is to tell you which piece is missing or broken instead of leaving you with a stack trace. The useful questions come in order: is the runtime installed, is its server answering, is the model pulled, and is it actually on the GPU. That last one matters more than it looks. Ollama will run a model partly on the CPU without complaint, and the only symptom is that everything is slow. `ollama ps` shows how a loaded model is split between CPU and GPU, which turns "it feels slow" into a fact.

## A provider interface from day one

The chat loop in Jarvis does not call Ollama directly. It talks to a provider interface: send messages, get back a reply or a stream of tokens. Ollama is one implementation behind it.

That costs almost nothing at the start and keeps options open. Another local runtime, another model, or a hosted model for the occasional hard question can be added without touching the chat code, which cannot lean on one backend's quirks because it does not know which backend it is talking to.

## Measure with a bench command

"This one feels faster" is not a measurement, so Jarvis has a `bench` command that compares models on speed.

Ollama makes this easy, because a non-streaming response reports its own timings in nanoseconds: model load time, prompt tokens and how long they took to process, and generated tokens and how long those took.

```python
# Simplified sketch, not the real Jarvis code
import httpx

def bench(model: str, prompt: str) -> dict:
    r = httpx.post(
        "http://localhost:11434/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
        timeout=300,
    )
    d = r.json()
    return {
        "model": model,
        "load_s": d.get("load_duration", 0) / 1e9,
        "gen_tokens_per_s": d["eval_count"] / (d["eval_duration"] / 1e9),
    }
```

For an assistant, two numbers matter most. Time to first token, roughly load time plus prompt processing, decides whether it feels responsive. Generation speed decides whether a long answer is bearable. Load time deserves its own line on a laptop: by default Ollama unloads an idle model after a few minutes, and the next question pays to bring it back. A fair comparison runs each prompt several times and reports cold and warm runs separately.

## What small local models are good at

Small models do well on narrow, well-shaped jobs:

- **Turning a sentence into structure.** In another side project, a rental search assistant, Llama 3.1 8B turns "2bhk in Pune under 20000" into structured filters, with a regex fallback when the model fails.
- **Short rewriting and classification.** Summarising a paragraph, tidying a note, sorting a message into one of a few buckets.
- **Anything private, offline or frequent,** where a network round trip or a per-call cost would get in the way.

## And what they are bad at

- **Facts.** A 4B model has read a lot and remembers little of it reliably, and it fills gaps fluently. Facts should come from a tool or a document, not from the weights.
- **Long chains of reasoning.** Multi-step plans drift. Keep each call to one step.
- **Long contexts.** Memory caps the window, and quality tends to drop well before the window is full.
- **Choosing from many tools.** One or two well-described tools work. A long tool list invites wrong picks and malformed arguments.

The design that follows is the same one I use with large hosted models at work: code does the deterministic parts, the model gets one narrow job per call, and every output is validated before anything acts on it. Small models just punish you sooner for skipping it. [Small models, big models and no model at all](/blog/small-models-and-no-model-paths) covers that routing.

## Where it stands

The always-on part is still ahead. What exists is a terminal chat on a solid base: repeatable setup, a doctor for when it breaks, a seam for swapping backends, and numbers for comparing models.

## Takeaways

1. On a small GPU, fit comes before quality. A model fully in video memory beats a better one split with the CPU.
2. Budget memory for context, not just weights. The KV cache is the part that grows.
3. Make setup a script and diagnosis a command. Most local LLM problems are environment problems.
4. Put a provider interface in front of the model on day one.
5. Measure speed per model, cold and warm, before choosing.
