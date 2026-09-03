# Handoff + first-token traceability

| Case | Traces | Layer | Data | Priority |
|------|--------|-------|------|----------|
| TC-A-01 Process run log appears on issue page | BR-TTFT-003, BR-UI-LIVE-003, J-TTFT | E2E | CREATED | P0 |
| TC-B-01 `request_confirmation` defaults to wake_assignee | BR-HANDOFF-002, CFG-001 | API | CREATED | P0 |
| TC-B-02 heartbeat-context skips review on standard workMode | BR-HANDOFF-006 | API | CREATED | P0 |
| TC-B-03 stdin is not gated on onSpawn | BR-TTFT-001 | Unit | n/a | P0 |
| TC-C-01 Issue live-run poll is 30s safety net | BR-UI-LIVE-001 | Unit-UI | n/a | P1 |
| TC-C-02 Agents panel enables realtime transcripts | BR-UI-LIVE-002 | Unit-UI | n/a | P1 |
| TC-F-01 Stagehand live board (paper.hertek.net) | BR-UI-LIVE-003, CFG-002 | Visual | DISCOVERED | P1 |

Automation: `tests/e2e/handoff-live-run.spec.ts` covers TC-A-01/B-01/B-02.
Unit tests cover TC-B-03. Stagehand: `tests/e2e/handoff-ttft.stagehand.mts`.
