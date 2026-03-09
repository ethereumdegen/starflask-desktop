import type { AdapterExecutionContext, AdapterExecutionResult } from "../types.js";
// @ts-ignore — starflask ships JS only
import { Starflask } from "starflask";
import { loadStarflaskCredentials } from "../../starflask-credentials.js";

/**
 * Starflask adapter: uses the starflask-cli SDK to fire hook events
 * on Starflask agents and poll for session completion.
 *
 * Config fields (from agent.adapterConfig):
 *   - starflaskApiUrl  (string, required): Starflask backend base URL
 *   - starflaskApiKey  (string, required): user API key for auth
 *   - starflaskAgentId (string, required): Starflask agent UUID
 *   - personaName      (string, optional): persona to use for the hook
 *   - pollIntervalMs   (number, optional): poll interval, default 3000
 *   - timeoutMs        (number, optional): max wait time, default 300000 (5 min)
 */

interface StarflaskConfig {
  starflaskApiUrl: string;
  starflaskApiKey: string;
  starflaskAgentId: string;
  personaName?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

function parseConfig(raw: Record<string, unknown>): StarflaskConfig {
  // Fall back to stored instance credentials if not in agent config
  const storedCreds = loadStarflaskCredentials();
  const starflaskApiUrl = String(raw.starflaskApiUrl ?? storedCreds?.apiUrl ?? "");
  const starflaskApiKey = String(raw.starflaskApiKey ?? storedCreds?.apiKey ?? "");
  const starflaskAgentId = String(raw.starflaskAgentId ?? "");
  if (!starflaskApiUrl) throw new Error("Starflask adapter: missing starflaskApiUrl");
  if (!starflaskApiKey) throw new Error("Starflask adapter: missing starflaskApiKey");
  if (!starflaskAgentId) throw new Error("Starflask adapter: missing starflaskAgentId");
  return {
    starflaskApiUrl: starflaskApiUrl.replace(/\/$/, ""),
    starflaskApiKey,
    starflaskAgentId,
    personaName: raw.personaName ? String(raw.personaName) : undefined,
    pollIntervalMs: Number(raw.pollIntervalMs) || 3000,
    timeoutMs: Number(raw.timeoutMs) || 300_000,
  };
}

function createClient(cfg: StarflaskConfig): InstanceType<typeof Starflask> {
  return new Starflask({
    apiKey: cfg.starflaskApiKey,
    baseUrl: cfg.starflaskApiUrl,
  });
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context, onLog } = ctx;
  const cfg = parseConfig(config);
  const sf = createClient(cfg);

  await onLog("stdout", `[starflask] Firing hook on agent ${cfg.starflaskAgentId}\n`);

  // Build the payload from Paperclip's execution context
  const payload: Record<string, unknown> = {
    paperclip_run_id: runId,
    paperclip_agent_name: agent.name,
    paperclip_company_id: agent.companyId,
    ...context,
  };

  try {
    // fireHookAndWait fires the hook and polls until completion
    const session = await sf.fireHookAndWait(
      cfg.starflaskAgentId,
      "paperclip_heartbeat",
      payload,
      {
        timeoutMs: cfg.timeoutMs,
        pollIntervalMs: cfg.pollIntervalMs,
      },
    );

    await onLog("stdout", `[starflask] Session ${session.id} completed\n`);

    const result = session.result;
    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: result?.summary ?? "Session completed",
      usage: result?.tokens_used
        ? { inputTokens: 0, outputTokens: 0, cachedInputTokens: result.tokens_used }
        : undefined,
      resultJson: result?.structured_data ?? undefined,
      sessionParams: { starflaskSessionId: session.id },
      sessionDisplayId: session.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isFailed = message.includes("Session failed:");

    return {
      exitCode: 1,
      signal: null,
      timedOut: message.includes("timed out"),
      errorMessage: message,
      summary: isFailed ? message.replace("Session failed: ", "") : message,
    };
  }
}
