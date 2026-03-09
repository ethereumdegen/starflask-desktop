import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { resolvePaperclipInstanceRoot } from "./home-paths.js";

export interface StarflaskCredentials {
  apiUrl: string;
  apiKey: string;
}

function credentialsPath(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "starflask-credentials.json");
}

export function loadStarflaskCredentials(): StarflaskCredentials | null {
  const filePath = credentialsPath();
  if (!existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf-8"));
    if (typeof raw.apiUrl === "string" && typeof raw.apiKey === "string") {
      return { apiUrl: raw.apiUrl, apiKey: raw.apiKey };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStarflaskCredentials(creds: StarflaskCredentials): void {
  const filePath = credentialsPath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(creds, null, 2), "utf-8");
}

export async function validateStarflaskApiKey(apiUrl: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const url = `${apiUrl}/agents`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) return { valid: true };
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: `Invalid API key (${res.status} from ${url})${body ? `: ${body.slice(0, 200)}` : ""}` };
    }
    return { valid: false, error: `Starflask API returned ${res.status} from ${url}${body ? `: ${body.slice(0, 200)}` : ""}` };
  } catch (err) {
    return { valid: false, error: `Could not reach Starflask API at ${url}: ${err instanceof Error ? err.message : String(err)}` };
  }
}
