import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult } from "../types.js";
// @ts-ignore — starflask ships JS only
import { Starflask } from "starflask";
import { loadStarflaskCredentials } from "../../starflask-credentials.js";

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const { config } = ctx;
  const checks: AdapterEnvironmentTestResult["checks"] = [];

  const storedCreds = loadStarflaskCredentials();
  const apiUrl = String(config.starflaskApiUrl ?? storedCreds?.apiUrl ?? "");
  const apiKey = String(config.starflaskApiKey ?? storedCreds?.apiKey ?? "");
  const agentId = String(config.starflaskAgentId ?? "");

  if (!apiUrl) {
    checks.push({ code: "no_url", level: "error", message: "starflaskApiUrl is required" });
  }
  if (!apiKey) {
    checks.push({ code: "no_key", level: "error", message: "starflaskApiKey is required (configure via Settings or agent config)" });
  }
  if (!agentId) {
    checks.push({ code: "no_agent", level: "error", message: "starflaskAgentId is required" });
  }

  if (checks.some((c) => c.level === "error")) {
    return { adapterType: "starflask", status: "fail", checks, testedAt: new Date().toISOString() };
  }

  // Use the SDK to verify connectivity
  try {
    const sf = new Starflask({ apiKey, baseUrl: apiUrl });
    const agents = await sf.listAgents();
    const found = Array.isArray(agents) && agents.some((a: { id: string }) => a.id === agentId);

    if (found) {
      checks.push({ code: "agent_found", level: "info", message: `Agent ${agentId} found in Starflask` });
    } else {
      checks.push({
        code: "agent_not_found",
        level: "warn",
        message: `Agent ${agentId} not found — check the ID`,
        hint: "The API key may not have access to this agent",
      });
    }
  } catch (err) {
    checks.push({
      code: "api_unreachable",
      level: "error",
      message: "Cannot reach Starflask backend",
      detail: String(err),
    });
  }

  const hasError = checks.some((c) => c.level === "error");
  const hasWarn = checks.some((c) => c.level === "warn");
  return {
    adapterType: "starflask",
    status: hasError ? "fail" : hasWarn ? "warn" : "pass",
    checks,
    testedAt: new Date().toISOString(),
  };
}
