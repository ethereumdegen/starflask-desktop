import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const starflaskAdapter: ServerAdapterModule = {
  type: "starflask",
  execute,
  testEnvironment,
  models: [],
  agentConfigurationDoc: `# Starflask agent configuration

Adapter: starflask

Connects to a Starflask backend agent. Heartbeats fire hook events on the
Starflask agent and poll for session completion.

Core fields:
- starflaskApiUrl  (string, required): Starflask backend URL (e.g. https://api.starflask.com)
- starflaskApiKey  (string, required): your Starflask user API key
- starflaskAgentId (string, required): the Starflask agent UUID to invoke
- personaName      (string, optional): Axoniac persona to use for heartbeats
- pollIntervalMs   (number, optional): session poll interval in ms (default: 3000)
- timeoutMs        (number, optional): max wait time in ms (default: 300000)
`,
};
