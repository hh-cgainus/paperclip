# Handoff + first-token latency — Phase 1 BRs

SUT: Herself Health Paperclip fork (`herselfhealth/paperclip`) at
`https://paper.hertek.net` (staging-equivalent on vm-cursor-devbox). Local
Playwright lab on `:3199` is a throwaway instance for deterministic adapter
proofs, not a substitute for the live board.

## Journeys

1. **J-HANDOFF** — Assignee A finishes (comment/status/blocker/child/confirmation).
   Control plane wakes assignee B. B starts useful work on the same issue
   without a full thread replay.
2. **J-TTFT** — A claimed run reaches first model/adapter stdout. The issue
   thread and Agents panel paint that token without a 3s poll wait.
3. **J-CONFIRM** — Agent posts `request_confirmation`. Board accepts. Assignee
   is woken automatically.
4. **J-PREP** — Workspace clone/skill staging is in progress. UI says
   "Preparing workspace", not an empty live transcript.

## State machine (run)

`queued` → `running` (claim, possibly before process spawn) → first
`heartbeat.run.log` → terminal (`succeeded`/`failed`/`cancelled`/`timed_out`/
`interrupted`).

Ephemeral UI phase (not a DB status): `Preparing workspace` via
`heartbeat.run.progress` until first log or adapter spawn.

## Business rules

| ID | Rule |
|----|------|
| BR-HANDOFF-001 | Comment/mention/blocker/child wakes enqueue the assignee; `continuationPolicy: none` does not. |
| BR-HANDOFF-002 | `request_confirmation` defaults to `wake_assignee` (accept and reject). Explicit `none` remains valid. |
| BR-HANDOFF-003 | When `PAPERCLIP_WAKE_PAYLOAD_JSON` is present and `fallbackFetchNeeded` is false, agents must not GET the full comment thread on that wake. |
| BR-HANDOFF-004 | When the wake payload says the harness already checked out the issue, agents must not POST checkout again. |
| BR-HANDOFF-005 | `GET /agents/me/inbox-lite` returns only compact assignment fields (no attention/productivity hydration). |
| BR-HANDOFF-006 | `GET /issues/:id/heartbeat-context` skips plan/document review payloads unless the issue `workMode` is `planning` or the caller sets `includeReview=1`. |
| BR-TTFT-001 | Adapter stdin is written without waiting for `onSpawn` persistence. |
| BR-TTFT-002 | Child stdout is not paused per chunk; backpressure only when pending `onLog` work exceeds a small bound. |
| BR-TTFT-003 | `heartbeat.run.log` is published on the company websocket before the durable log append awaits. |
| BR-TTFT-004 | After claim, before adapter spawn, the run publishes `Preparing workspace` progress. |
| BR-UI-LIVE-001 | Issue live-run rows use websocket lifecycle events; HTTP poll is a ≥30s safety net, not 3s. |
| BR-UI-LIVE-002 | Agents dashboard transcripts enable realtime websocket updates. |
| BR-UI-LIVE-003 | First live log chunk appears in the issue transcript without waiting for the safety-net poll. |

## Config

| ID | Surface | Staging expectation |
|----|---------|---------------------|
| CFG-001 | `continuationPolicy` schema default | `wake_assignee` for `request_confirmation` |
| CFG-002 | OpenRouter Stagehand | `STAGEHAND_MODEL=openai/gpt-4o` via Infisical; fail closed if missing |
| CFG-003 | Deploy | `paper.hertek.net` is the live board; code lands via Bitbucket PR to `master` (Release Manager). |

## Tiers

| ID | Persona |
|----|---------|
| TIER-1 | Board user on `paper.hertek.net` (Entra or local_trusted lab) |
| TIER-2 | Assignee agent (grok_local / claude_local / process fixture) |

## Open questions

1. Active vs Passive deploy of this branch onto `paper.hertek.net` before
   Stagehand retest against the live board.
2. Entra SSO on the live board may block unattended Stagehand login; lab
   Playwright on `:3199` is the deterministic proof if SSO blocks.
