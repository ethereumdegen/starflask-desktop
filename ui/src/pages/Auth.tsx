import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "@/lib/router";
import { starflaskConfigApi } from "../api/starflask-config";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

const inputClass =
  "w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 font-mono";

export function AuthPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [apiUrl, setApiUrl] = useState("https://starflask.com/api");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);

  // If already configured, redirect
  const { data: config, isLoading } = useQuery({
    queryKey: ["starflask-config"],
    queryFn: () => starflaskConfigApi.get(),
    retry: false,
  });

  useEffect(() => {
    if (config?.configured) {
      navigate(nextPath, { replace: true });
    }
  }, [config, navigate, nextPath]);

  const mutation = useMutation({
    mutationFn: async () => {
      await starflaskConfigApi.save(apiUrl.trim(), apiKey.trim());
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["starflask-config"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.health });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      navigate(nextPath, { replace: true });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Connection failed");
    },
  });

  const canSubmit = apiUrl.trim().length > 0 && apiKey.trim().length > 8;

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
            <Zap className="h-5 w-5 text-cyan-500" />
          </div>
          <span className="text-lg font-semibold">Starflask</span>
        </div>

        <h1 className="text-xl font-semibold">Connect to Starflask</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your Starflask user API key to get started.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API URL</label>
            <input
              className={inputClass}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://starflask.com/api"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
            <input
              className={inputClass}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_..."
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Your user API key from your Starflask dashboard settings.
            </p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={!canSubmit || mutation.isPending} className="w-full">
            {mutation.isPending ? "Connecting…" : "Connect"}
          </Button>
        </form>
      </div>
    </div>
  );
}
