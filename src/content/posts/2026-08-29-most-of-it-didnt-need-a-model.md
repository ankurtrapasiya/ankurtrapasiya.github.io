---
title: Most of what I automated didn't need a model
date: 2026-08-29
summary: I gave the box under my desk an agent so it could act on its own instead of waiting to be asked. Seven jobs run on a schedule now. Six of them never call the model at all, and working out which one does was the useful part.
tags: ["agents", "hermes", "self-hosting", "llm", "automation"]
draft: false
---

The box under my desk could think and couldn't do anything.

That's not a complaint about the model. Two posts back I worked out
[why it runs at the speed it does](/posts/2026-08-16-building-my-own-ai/), and
last week I found
[the term my own equation was missing](/posts/2026-08-20-right-and-still-fooled-me/)
and roughly doubled it. What I had at the end of all that was a very good chat
window. You type, it answers, you close the tab. Nothing it says touches
anything.

So I gave it hands. Five days later it does work for me on a schedule, without
being asked. And then I went and counted what those jobs actually do, which is
where this post really starts: **six of the seven scheduled jobs I run never
call the model at all.**

That surprised me enough that I want to explain it properly. But first, what the
thing is, because I've been throwing the word "agent" around as if it means
something specific.

## What Hermes Agent actually is

[Hermes Agent](https://github.com/NousResearch/hermes-agent) is an open-source
(MIT) agent runtime from [Nous Research](https://nousresearch.com/). I'm running
v0.20.5.

Strip away the branding and it's four things bolted together, and it's worth
naming them separately, because people usually mean only the first one when they
say "agent":

**A loop with tools.** The model gets asked a question, and instead of only
answering, it can call things — read a file, write a file, run a shell command,
fetch a page, search its own history. It sees the result and decides what to do
next. The README counts 40+ of these. That loop is the actual difference between
a chat window and something that acts.

**Skills.** A skill is a folder with instructions in it, telling the agent how to
do a particular job the way you want it done. Hermes follows the open
[agentskills.io](https://agentskills.io/) format, so they're portable. I have 54
of them on this box. Most were written for one specific recurring task and never
touched again, which is exactly the right lifecycle for them.

**A scheduler.** A built-in cron that runs a job unattended and delivers the
result somewhere. This turns out to be the part I use most, and I'll come back to
it.

**Front doors.** The same agent is reachable from a terminal, or from a chat app.
My config has toolsets for eleven of them — CLI, [Discord](https://discord.com/),
Telegram, Slack, WhatsApp, Signal, Home Assistant and a few I'll never use. I
mostly talk to it from a terminal and a Discord channel.

And the tool calls run inside [Docker](https://www.docker.com/) sandboxes rather
than straight on my machine. Hermes supports seven backends for that — local,
Docker, SSH and four hosted ones. I use Docker, and I'll get to why that matters.

## Pointing it at my own model

The reason I could use any of this is one block of config:

```yaml
model:
  default: /models/Qwen3.8-27B-Q5_K_M.gguf
  provider: custom
  base_url: http://localhost:8080/v1
  api_mode: chat_completions
```

Hermes speaks OpenAI's chat-completions wire format.
[llama.cpp](https://github.com/ggml-org/llama.cpp) already serves it. So the
agent's brain is the same GGUF I benchmarked last week, sitting in the same 128GB
of unified memory, three feet away, over loopback. No account, no per-token
meter, nothing leaving the room.

That last part is a claim, so here's the check. Hermes keeps per-session
accounting in `~/.hermes/state.db`:

```sql
select model, billing_provider, sum(api_call_count)
from session_model_usage group by 1, 2;
```

480 of 612 calls went to the local GGUF. The other 132 are all from today, when I
started poking at hosted models on purpose — and 121 of those went to a fallback
provider I'd configured and forgotten about. Total spend to date is 24 cents,
which is both reassuring and a reminder that "local" is a setting, not a
guarantee. If you set up something like this, go and read your own usage table
before you tell people nothing leaves your house. I nearly published that
sentence a week ago and it would have been true then and false now.

## What it actually does for me

Deliberately unglamorous. Seven enabled jobs:

- A nightly one reads a calendar feed and creates a reminder for each new
  deadline, into [Apple Reminders](https://support.apple.com/guide/reminders/welcome/mac) over
  [CalDAV](https://datatracker.ietf.org/doc/html/rfc4791) — from a Linux box,
  with an app-specific password and no Mac anywhere in the loop. It's idempotent
  through a state file, which matters more than it sounds: delete that file and
  the next run cheerfully recreates thirty duplicates.
- Two more sync notes and config out of working directories into git, every half
  hour, committing and pushing only when there's something to push. 142 runs so
  far, silent every time there was nothing to do.
- A daily one pulls fresh items from a course calendar into that same reminder
  pipeline.
- A weekly one reads the last seven days of commits in a notes repo and writes me
  a digest of what I actually learned, posted to a Discord channel.
- Two more watch feeds I care about and post when something new shows up.

That's it. That's the list. Five days of work for a list that a reasonable person
would look at and say "cron could do that."

## Which is the point

Because cron mostly *is* doing that.

Hermes cron jobs can be defined two ways: as a natural-language prompt the agent
interprets and acts on, or as a script it just runs on a schedule with
`no_agent: true`. Six of my seven enabled jobs are the second kind. Plain bash,
no model, no sandbox, no tokens.

The one that isn't is the weekly digest. And the difference between them is
sharp once you see it. "Take these deadlines and create a reminder for each"
is a job with one right answer, so a script is not just adequate, it's *better* —
it's deterministic, it costs nothing, it can't hallucinate a due date, and it
fails loudly. Whereas "read a week of commits and tell me what I learned" has no
right answer. It needs something that can read prose and judge what matters. That
one earns its model.

I didn't design it this way. I reached for the agent first for everything,
because that was the new toy, and then watched jobs migrate to scripts one at a
time as I understood each of them well enough to write down what it should do.
Understanding the task well enough to script it is the thing that removes the
need for the model.

So the value I actually got from Hermes isn't the intelligence. It's the
scaffolding around it: a scheduler with retry and state, delivery to a chat
channel, a sandbox, a place to keep skills, and one consistent way to reach all
of it. The model is one tool in that box, and it's the expensive one, so I use it
where the task is genuinely fuzzy.

That's the opposite of how agents get sold. It's also the only version of this
I'd recommend to somebody else.

## Four days of it not working

I should be honest that none of the above was the hard part.

Getting to a working install took four days, and every failure on the way was
silent. Hermes routes sandbox traffic through its own egress proxy, which derives
extra listeners from the one port you configure — and one of those derived ports
collided with a container I'd started days earlier. The proxy died on the failed
bind **and exited with code 0**, so every layer above it saw a clean shutdown.
Then, once fixed, nothing on the box was starting the proxy at boot at all, which
I noticed only because the machine had booted three days before the daemon had. A
[systemd](https://systemd.io/) user unit fixed that, with a `Type=forking` and a
poll for the `docker0` bridge — a user unit can't order itself after a system
service, so it has to wait for the interface itself.

And I spent a full day diagnosing a Docker bug — session IDs contain colons,
`docker run -v` splits on colons — before finding it had been fixed upstream
three hours after I installed. I'd have saved the day by running the updater
instead of reading the source.

I'll write that up properly. The reason it belongs here in one paragraph is that
this is what adopting an agent actually costs right now, and it isn't tokens.

## Where I think this goes

The part I haven't used is larger than the part I have.

The sandbox mounts almost nothing by default — skills and caches, read-only, no
credentials. That felt over-cautious until I said it out loud: `terminal` is a
general-purpose shell, and the thing deciding what to type into it is a language
model reading messages from a chat app. Anything that reaches the chat window
reaches the shell. Giving it my repos meant being explicit about it, one mount at
a time, and I think that's the right shape for this to take generally — capability
granted deliberately, not by default.

What I want to try next, roughly in order of how much I believe in it:

- **Tools it doesn't have yet.** Hermes speaks [MCP](https://modelcontextprotocol.io/),
  so anything with an MCP server becomes something the agent can drive. That's
  where the interesting surface area is, and I've barely touched it.
- **Better answers from more than one model.** There's a mixture-of-agents mode
  that asks several models and has a local one synthesise the answers. Mine is
  switched on with both reference models disabled, which is a fancy way of saying
  I haven't tried it.
- **Longer memory.** It keeps a searchable history and curates its own notes
  across sessions. Five days in, I have no opinion on whether that's useful yet.
  Ask me in a month.

## Still open

The thing I actually want to chase came out of that same usage table. Across 52
sessions the box has processed about 4.1M prompt tokens against 279K of output —
roughly fifteen tokens in for every one out — and another 16.7M prompt tokens were
served straight from llama.cpp's prefix cache, never recomputed. That's about 80%
of every prompt token this agent has sent.

Both of my previous posts argued the number that matters is decode speed. For a
chat window that's true. For an agent it looks like it's barely relevant — the
work is nearly all prompt, and most of the prompt is a cache hit. If that holds
up under a controlled measurement instead of my mixed real-world sessions, then
I've spent a month optimising the wrong end of this machine.

Also still open: I've never actually rebooted this box since building the systemd
unit, and the reboot case is the entire reason it exists. And I don't know what
sent 121 calls to a hosted fallback today.

If you're running an agent against a local model and you've measured that
prompt-to-output split properly, I'd like to see your numbers. Mine are
observational and I know it.

## References

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — the runtime, MIT licensed, v0.20.5 here
- [Agent Skills](https://agentskills.io/) — the portable skill format Hermes uses
- [Model Context Protocol](https://modelcontextprotocol.io/) — how you give an agent tools it didn't ship with
- [llama.cpp](https://github.com/ggml-org/llama.cpp) — serving the model at `localhost:8080`
- [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B) — the model doing the thinking
- [RFC 4791: CalDAV](https://datatracker.ietf.org/doc/html/rfc4791) — how a Linux box writes to Apple Reminders

Versions: Hermes Agent v0.20.5 (2026.8.19); llama.cpp build `b10524-9ee9fc04c`
serving Qwen3.8-27B at Q5_K_M with the Q4_0 MTP draft head, `--ctx-size 262144`,
`--parallel 1`; NVIDIA GB10, 128GB unified. Job counts and token figures are from
`~/.hermes/cron/jobs.json` and `~/.hermes/state.db` on 2026-08-29.
