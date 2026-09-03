import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Handoff + first-token E2E (BR-HANDOFF / BR-TTFT / BR-UI-LIVE).
 *
 * Uses the throwaway local_trusted Playwright instance. Stagehand against
 * paper.hertek.net is tests/e2e/handoff-ttft.stagehand.mts (Active/Passive confer).
 */

type Json = Record<string, unknown>;

const TOKEN = `e2e-ttft-${Date.now()}`;

async function json<T = Json>(
  response: Awaited<ReturnType<APIRequestContext["get"]>>,
): Promise<T> {
  expect(
    response.ok(),
    `${response.url()} failed ${response.status()}: ${await response.text()}`,
  ).toBe(true);
  return (await response.json()) as T;
}

test.describe("Handoff and live first-token", () => {
  test("process run log is durable and visible on the issue page", async ({ page, request }) => {
    const company = await json<{ id: string; issuePrefix: string }>(
      await request.post("/api/companies", {
        data: { name: `Handoff TTFT ${Date.now()}` },
      }),
    );
    const agent = await json<{ id: string; urlKey?: string }>(
      await request.post(`/api/companies/${company.id}/agents`, {
        data: {
          name: `TTFT Scout ${Date.now()}`,
          role: "qa",
          title: "First-token scout",
          capabilities: "Emits a deterministic stdout token.",
          adapterType: "process",
          adapterConfig: {
            command: process.execPath,
            args: [
              "-e",
              `process.stdout.write(${JSON.stringify(`${TOKEN}\n`)}); setInterval(() => {}, 1000)`,
            ],
          },
        },
      }),
    );
    const issue = await json<{ id: string; identifier: string }>(
      await request.post(`/api/companies/${company.id}/issues`, {
        data: {
          title: "Emit first-token marker",
          status: "todo",
          assigneeAgentId: agent.id,
        },
      }),
    );

    const created = await json<{
      id: string;
      continuationPolicy: string;
    }>(
      await request.post(`/api/issues/${issue.id}/interactions`, {
        data: {
          kind: "request_confirmation",
          payload: { version: 1, prompt: "Resume after this confirmation?" },
        },
      }),
    );
    expect(created.continuationPolicy).toBe("wake_assignee");

    const context = await json<{ planReviewContext: unknown; documentReviewContext: unknown }>(
      await request.get(`/api/issues/${issue.id}/heartbeat-context`),
    );
    expect(context.planReviewContext).toBeNull();
    expect(context.documentReviewContext).toBeNull();

    const run = await json<{ id: string }>(
      await request.post(`/api/agents/${agent.id}/heartbeat/invoke`, {
        data: {
          reason: "issue_assigned",
          payload: { issueId: issue.id, taskId: issue.id, taskKey: issue.id },
        },
      }),
    );

    let logContent = "";
    for (let i = 0; i < 80; i += 1) {
      const logRes = await request.get(`/api/heartbeat-runs/${run.id}/log?offset=0&limitBytes=65536`);
      if (logRes.ok()) {
        const log = (await logRes.json()) as { content?: string };
        logContent = log.content ?? "";
        if (logContent.includes(TOKEN)) break;
      }
      await page.waitForTimeout(250);
    }
    expect(logContent, "durable run log should contain the first-token marker").toContain(TOKEN);

    const liveRuns = await json<Array<{ id: string }>>(
      await request.get(`/api/issues/${issue.id}/live-runs`),
    );
    expect(liveRuns.some((row) => row.id === run.id)).toBe(true);

    const agentKey = agent.urlKey ?? agent.id;
    await page.goto(`/${company.issuePrefix}/agents/${agentKey}/runs/${run.id}`);
    await expect(page.getByText(TOKEN)).toBeVisible({ timeout: 20_000 });
  });
});
