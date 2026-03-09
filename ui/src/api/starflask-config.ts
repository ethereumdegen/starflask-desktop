export type StarflaskConfig = {
  configured: boolean;
  apiUrl: string | null;
};

export const starflaskConfigApi = {
  get: async (): Promise<StarflaskConfig> => {
    const res = await fetch("/api/starflask-config", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Failed to load Starflask config");
    return res.json();
  },

  save: async (apiUrl: string, apiKey: string): Promise<void> => {
    const res = await fetch("/api/starflask-config", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiUrl, apiKey }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? `Failed to save config (${res.status})`);
    }
  },

  logout: async (): Promise<void> => {
    await fetch("/api/starflask-config/logout", {
      method: "POST",
      credentials: "include",
    });
  },
};
