---
title: Four days of things that looked like they were working
date: 2026-08-27
summary: I gave the box under my desk an agent to drive it. Every failure on the way there was silent — a proxy exiting 0, a daemon nothing started at boot, and a bug I spent a day diagnosing that had been fixed before I ever hit it.
tags: ["agents", "self-hosting", "llm", "docker", "systemd"]
draft: false
---

The box under my desk could think and couldn't do anything.

That's not a complaint about the model. Two posts ago I worked out
[why it runs at the speed it does](/posts/2026-08-16-building-my-own-ai/), and
last week I found
[the term my own equation was missing](/posts/2026-08-20-the-equation-was-missing-a-term/)
and roughly doubled it. What I had at the end of that was a very good chat
window. You type, it answers, you close the tab. Nothing it says touches
anything.

So I gave it hands. Four days later it does actual work for me, on a schedule,
without asking. Almost none of those four days were about the model.

## Pointing the thing at itself

The agent is [Hermes Agent](https://github.com/NousResearch/hermes-agent) from
[Nous Research](https://nousresearch.com/), v0.20.5.

<!-- WHY-HERMES: pending Ankur's own words on choosing this over DeepSeek
     Harness, which the 08-16 post named as the destination. -->

The part I cared about is one block of config:

```yaml
model:
  default: /models/Qwen3.8-27B-Q5_K_M.gguf
  provider: custom
  base_url: http://localhost:8080/v1
  api_mode: chat_completions
```

That's the whole trick. Hermes speaks OpenAI's chat-completions wire format,
[llama.cpp](https://github.com/ggml-org/llama.cpp) already serves it, so the
agent's brain is the same GGUF I benchmarked last week — sitting in the same
128GB of unified memory, three feet away, reachable over loopback.

I wanted to be sure that was actually true rather than aspirationally true,
because "local model with a cloud fallback you forgot about" is an easy thing to
end up with. Hermes keeps per-session accounting in `~/.hermes/state.db`, so I
asked it:

```sql
select distinct model, billing_provider from session_model_usage;
```

```
/models/Qwen3.8-27B-Q5_K_M.gguf|custom
```

One row. Across 29 sessions and 322 API calls, every request went to
`localhost:8080`. Nothing left the house.

Then the infrastructure started fighting.

## A proxy that failed by succeeding

Hermes runs tool calls inside [Docker](https://www.docker.com/) sandboxes, and
routes their outbound traffic through its own egress proxy, `iron-proxy`. Mine
would not stay up. `hermes egress start` reported the daemon "exited
immediately," which is a strange thing for a daemon to do quietly.

The log had it:

```
ERROR fatal error  proxy: http listen: listen tcp 172.17.0.1:9091:
                   bind: address already in use
```

Port 9091, which I had never configured anywhere. The proxy takes one knob —
`tunnel_port` — and derives three listeners from it:

| listener | port | job |
|---|---|---|
| `tunnel_port` | 9090 | CONNECT/MITM, what sandboxes point `HTTPS_PROXY` at |
| `tunnel_port + 1` | 9091 | plain-HTTP forward |
| `tunnel_port + 2` | 9092 | management API |

The derivation is one line —
`plain_http_listen = f"{bind_host}:{tunnel_port + 1}"` — and on the 9090 default
the middle one lands on 9091. Which, since three days earlier,
[gluetun](https://github.com/qdm12/gluetun) had been publishing on `0.0.0.0` to
front a [Transmission](https://transmissionbt.com/) web UI. iron-proxy binds the
`docker0` bridge address `172.17.0.1`, and `0.0.0.0` covers every local address
including that one. So the bind loses, and the daemon dies.

Here is the part worth keeping. **It dies with exit code 0.** A failed bind on a
listener the operator never asked for takes the process down, and the process
reports success on the way out. Every layer above sees a clean exit. `hermes
egress start` doesn't say "crashed," it says "exited immediately," because from
where it stands nothing went wrong.

The fix is to move the whole block: `--tunnel-port 9490`, which puts the derived
listeners on 9490/9491/9492 and out of everyone's way.

I then spent an hour convincing myself that flag had to be passed every single
time, because `_read_tunnel_port_from_config()` — the function that looks like
it would persist the port — has exactly one occurrence in the source tree, which
is its own definition. Dead code. I wrote a note to that effect, added a shell
wrapper to inject the flag, and moved on.

The note was wrong, and I only found out because I went back to check it before
writing this. `setup` does persist the port, through a different path
entirely — every `config.yaml` backup from before the fix has `proxy: enabled:
true` with no `tunnel_port` key at all, which is precisely why the bare command
used to fall through to 9090. Once the key exists, it's honoured. I'd found a
real piece of dead code and drawn a conclusion from it that the dead code didn't
support.

I kept the wrapper anyway. It now protects against exactly one thing: somebody
deleting that config key. That's a worse reason than the one I built it for, but
it isn't no reason.

## Nothing was starting it

The port fix persisted in config. It did not persist across a reboot, because
nothing on the box started iron-proxy at boot.

That took embarrassingly long to notice, and the evidence was sitting in plain
sight: the machine had booted on 2026-08-21, and the running daemon had started
on 2026-08-24 — by me, by hand. The config was correct and nothing was
listening.

Nothing else starts it, either. The Docker backend only *complains*:
`tools/environments/docker.py` raises `RuntimeError` with "iron-proxy is enabled
but not running on port 9490" and refuses the sandbox. That error had been
showing up in my logs as failed tool calls:

```
tools.file_tools: write_file error: RuntimeError: proxy.enabled is true
  but iron-proxy is not configured.
```

An agent that can't write files, because a torrent client took a port.

So: a [systemd](https://systemd.io/) user unit. Three things in it are
load-bearing and none of them are obvious.

**`Type=forking` with a `PIDFile`.** `hermes egress start` spawns iron-proxy in
a new session, writes the pidfile, and returns. Under `Type=simple` systemd
would watch the CLI, see it exit a second later, and conclude the service died.
With forking plus `PIDFile`, systemd adopts the daemon itself as `MainPID`, and
`Restart=always` genuinely supervises it. I checked with `kill -9`; it was back
in about five seconds.

**An `ExecStartPre` that polls for `docker0`.** iron-proxy binds `172.17.0.1`,
which doesn't exist until dockerd has created the bridge. The obvious fix —
`After=docker.service` — is not available, because `docker.service` is a
*system* unit and this is a *user* unit, and a user unit cannot order itself
against one. So the unit polls for the interface for up to 90 seconds. Without
it, boot is a race, and losing the race means a failed bind, and a failed bind
means exit code 0 again.

**An `ExecStart` that sources a secrets file.** systemd user units never read a
shell profile. The CLI reads `OPENROUTER_API_KEY` and `OPENAI_API_KEY` out of
its own environment to build the daemon's minimal subprocess env, and the
proxy's config declares one of them `require: true`. So the unit sources
`~/.secrets.zsh` before exec'ing. Deliberately not an `EnvironmentFile=` with
the keys copied in — that duplicates secrets into a second file and guarantees
drift.

One honest caveat: I verified all of this by hand — three listeners, the
daemon's environment, a container reaching `172.17.0.1:9490` — but the box has
been up continuously since 2026-08-21. **The reboot case is the entire point of
the unit and it is the one case I haven't actually tested.**

## The bug I didn't need to find

Then a real one, and my favourite mistake of the four days.

Interactive chat sessions couldn't use the `terminal` tool at all. Any platform,
every time. Hermes derives a sandbox's host directory from the session ID, and a
session ID looks like this:

```
session:agent:main:discord:group:<channel>:<user>
```

Docker's `-v host:container` flag splits on colons. Hand it a host path that
contains six of them and `docker run` refuses before the container exists:
`invalid spec: too many colons`.

I diagnosed it, confirmed it on two platforms, and wrote it up as needing a
patch to Hermes' own source that I wasn't going to attempt — sanitize the task
ID before using it as a directory name. I built a workaround instead: the skills
that run inside a chat turn never call `terminal`, only `write_file`, which
writes straight to the host and never spins up a sandbox. All git work moved
into cron jobs, which run outside any chat session and have task IDs without
colons in them.

The workaround is fine. The diagnosis was a waste of a day.

`fix(docker): sanitize the session-key task_id used as a sandbox path` landed
upstream at 2026-08-24T04:12 UTC. I had installed Hermes at 2026-08-24T01:08
UTC, and last run `hermes update` at 01:34. The fix arrived **about three hours
after I installed, and I hit the bug two days later on code I hadn't pulled.**
Running the updater would have been cheaper than reading the source.

And the upstream fix is better than mine in a way I wouldn't have thought of.
Sanitizing colons to underscores is not injective: `a:b` and `a_b` collapse to
the same directory name, and two sessions sharing one persistent sandbox means
one session's `/root` leaking into another's. So the real fix appends a digest
of the original ID. My version of that patch would have had a quiet
cross-session data leak in it.

I've kept the workaround, because the skills don't need a shell and not needing
one is a smaller attack surface. But I've stopped believing my own notes about
what's unfixed upstream without checking the date on them first.

## A shell that any message can drive

That last point is worth dwelling on, because it's the thing that makes agents
different from every other automation I've written.

By default, the sandbox mounts almost nothing: skills and cache directories,
read-only, and no credentials at all. That felt over-cautious until I said it
out loud. `terminal` is a general-purpose shell, and the thing deciding what to
type into it is a language model reading messages from a chat app. Anything that
reaches the chat window reaches the shell.

Giving it my repos meant being explicit about it:

```yaml
terminal:
  docker_volumes:
    - /home/.../repo:/home/.../repo
  docker_run_as_host_user: true
```

The second line is the one that isn't about security. Without it the container
runs as root, every file it touches ends up root-owned — including new git
objects — and host-side `git commit` starts failing with permission errors that
have nothing to do with git.

## What it actually does

Less than the four days would suggest, which is normal.

A daily job reads an `.ics` calendar feed and creates a reminder per new
deadline in [Apple Reminders](https://www.icloud.com/reminders) — from a Linux
box, over [CalDAV](https://datatracker.ietf.org/doc/html/rfc4791), with an
app-specific password and no Mac anywhere in the loop. It's idempotent through a
tracked state file, which matters more than it sounds: delete that file and the
next run recreates thirty-odd reminders as duplicates.

It posts rich [Discord](https://discord.com/developers/docs/resources/channel#embed-object)
embeds by calling the bot API directly, because Hermes' own delivery is
plain-text only. Which means those jobs deliver `local` and post for themselves;
letting cron deliver as well would double-post everything.

And I can tell it a deadline in a chat message and it writes that into a config
file in a git repo, which another job commits and pushes half an hour later.

## Still open

The [Prometheus](https://prometheus.io/docs/introduction/overview/) stack I
promised at the end of the first post has not happened:

```bash
$ curl -o /dev/null -w '%{http_code}\n' http://localhost:8080/metrics
501
```

Same 501 as three weeks ago. Still one flag. Still not done.

But the thing I actually want to chase next came out of that same
`state.db`. Across those 29 sessions the box processed 1,875,308 prompt tokens
and produced 162,722 tokens of output — **about eleven and a half tokens in for
every one out.** A further 8,909,834 prompt tokens were served straight from
llama.cpp's prefix cache and never recomputed at all, which is 83% of every
prompt token this agent has ever sent.

Both of my previous posts argued that the number that matters is decode speed —
bytes read per generated word. For a chat window that's true. For an agent it
looks like it's barely relevant: the work is almost all prompt, and most of the
prompt is a cache hit. If that holds up under a controlled measurement rather
than the mixed real-world sessions I've got, then the way I've been reasoning
about this machine has been answering the wrong question for a month.

I don't know yet. That's the next one.

If you're running an agent against a local model and you've measured that split
properly, I'd genuinely like to see your numbers — mine are observational and I
know it.

## References

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — the agent framework, v0.20.5
- [llama.cpp](https://github.com/ggml-org/llama.cpp) — serving the model at `localhost:8080`
- [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B) — the model doing the thinking
- [gluetun](https://github.com/qdm12/gluetun) — the container that had 9091 first
- [RFC 4791: CalDAV](https://datatracker.ietf.org/doc/html/rfc4791) — how a Linux box writes to Apple Reminders
- [systemd.service](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html) — `Type=forking`, `PIDFile`, and why user units can't order against system units

Versions: Hermes Agent v0.20.5 (2026.8.19); llama.cpp build `b10524-9ee9fc04c`
serving Qwen3.8-27B at Q5_K_M with the Q4_0 MTP draft head, `--ctx-size 262144`,
`--parallel 1`; NVIDIA GB10, 128GB unified. Token counts are from
`~/.hermes/state.db` covering 2026-08-24 to 2026-08-27.
