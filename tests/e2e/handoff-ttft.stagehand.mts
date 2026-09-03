/**
 * Stagehand proof against paper.hertek.net (CFG-002).
 *
 * Fail closed: missing OpenRouter key/model or missing Stagehand package
 * is a misconfiguration, not a skip.
 *
 * Confer Active vs Passive before this hits a board that does not yet
 * include the perf/handoff-ttft deploy.
 */
const REQUIRED_MODEL = "openai/gpt-4o";
const SUT = process.env.PAPERCLIP_E2E_SUT ?? "https://paper.hertek.net";

function failClosed(message: string): never {
  console.error(message);
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  failClosed("STAGEHAND_MISCONFIG: OPENAI_API_KEY / OPENROUTER_API_KEY missing");
}
const model = process.env.STAGEHAND_MODEL ?? "";
if (model !== REQUIRED_MODEL) {
  failClosed(`STAGEHAND_MISCONFIG: STAGEHAND_MODEL must be ${REQUIRED_MODEL} (got ${model || "<empty>"})`);
}

const stagehandMod = await import("@browserbasehq/stagehand").catch(() => null);
if (!stagehandMod) {
  failClosed("STAGEHAND_MISCONFIG: @browserbasehq/stagehand is not installed");
}

const Stagehand = stagehandMod.Stagehand;
const stagehand = new Stagehand({
  env: "LOCAL",
  modelName: REQUIRED_MODEL,
  modelClientOptions: {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1",
  },
});

await stagehand.init();
const page = stagehand.page;
await page.goto(SUT);
const snapshot = await stagehand.extract(
  "Is this the Paperclip login/SSO page or an authenticated board with issues/agents? Quote visible headings.",
);
console.log(JSON.stringify({ sut: SUT, snapshot }, null, 2));
await stagehand.close();
