import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import { AGENT_ROLES } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Shield, User, Zap } from "lucide-react";
import { cn, agentUrl } from "../lib/utils";
import { roleLabels } from "../components/agent-config-primitives";
import { AgentIcon } from "../components/AgentIconPicker";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function NewAgent() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("general");
  const [reportsTo, setReportsTo] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [reportsToOpen, setReportsToOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Starflask fields
  const [starflaskApiUrl, setStarflaskApiUrl] = useState("https://starflask.com/api");
  const [starflaskApiKey, setStarflaskApiKey] = useState("");
  const [starflaskAgentId, setStarflaskAgentId] = useState("");
  const [personaName, setPersonaName] = useState("");

  // Fetch Starflask agents when API key is set
  const {
    data: starflaskAgents,
    isLoading: starflaskAgentsLoading,
  } = useQuery({
    queryKey: ["starflask-agents", starflaskApiUrl, starflaskApiKey],
    queryFn: async () => {
      const res = await fetch(`${starflaskApiUrl}/agents`, {
        headers: { Authorization: `Bearer ${starflaskApiKey}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch agents (${res.status})`);
      return res.json() as Promise<Array<{ id: string; name: string; description?: string }>>;
    },
    enabled: starflaskApiKey.length > 8,
    retry: false,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const isFirstAgent = !agents || agents.length === 0;
  const effectiveRole = isFirstAgent ? "ceo" : role;

  useEffect(() => {
    setBreadcrumbs([
      { label: "Agents", href: "/agents" },
      { label: "New Agent" },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (isFirstAgent) {
      if (!name) setName("CEO");
      if (!title) setTitle("CEO");
    }
  }, [isFirstAgent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill name when a Starflask agent is selected
  useEffect(() => {
    if (!starflaskAgentId || !starflaskAgents) return;
    const selected = starflaskAgents.find((a) => a.id === starflaskAgentId);
    if (selected && !name) {
      setName(selected.name);
    }
  }, [starflaskAgentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createAgent = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      agentsApi.hire(selectedCompanyId!, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId!) });
      navigate(agentUrl(result.agent));
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to create agent");
    },
  });

  function handleSubmit() {
    if (!selectedCompanyId || !name.trim()) return;
    setFormError(null);

    if (!starflaskApiUrl.trim()) { setFormError("Starflask API URL is required"); return; }
    if (!starflaskApiKey.trim()) { setFormError("Starflask API key is required"); return; }
    if (!starflaskAgentId.trim()) { setFormError("Select a Starflask agent"); return; }

    createAgent.mutate({
      name: name.trim(),
      role: effectiveRole,
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(reportsTo ? { reportsTo } : {}),
      adapterType: "starflask",
      adapterConfig: {
        starflaskApiUrl: starflaskApiUrl.trim(),
        starflaskApiKey: starflaskApiKey.trim(),
        starflaskAgentId: starflaskAgentId.trim(),
        ...(personaName.trim() ? { personaName: personaName.trim() } : {}),
      },
      runtimeConfig: {
        heartbeat: {
          enabled: false,
          intervalSec: 300,
          wakeOnDemand: true,
          cooldownSec: 10,
          maxConcurrentRuns: 1,
        },
      },
      budgetMonthlyCents: 0,
    });
  }

  const currentReportsTo = (agents ?? []).find((a) => a.id === reportsTo);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">
          <span className="inline-flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-500" />
            Connect Starflask Agent
          </span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Link an agent from your Starflask backend to this organization.
        </p>
      </div>

      <div className="border border-border">
        {/* Starflask config */}
        <div className="border-b border-border">
          {/* API URL */}
          <div className="px-4 py-3 border-b border-border">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Starflask API URL
            </label>
            <input
              className={inputClass}
              placeholder="https://starflask.com/api"
              value={starflaskApiUrl}
              onChange={(e) => setStarflaskApiUrl(e.target.value)}
              autoFocus
            />
          </div>

          {/* API Key */}
          <div className="px-4 py-3 border-b border-border">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              API Key
            </label>
            <input
              className={inputClass}
              type="password"
              placeholder="sk_..."
              value={starflaskApiKey}
              onChange={(e) => setStarflaskApiKey(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Your Starflask user API key. Find it in your Starflask dashboard settings.
            </p>
          </div>

          {/* Agent Selector */}
          <div className="px-4 py-3 border-b border-border">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Starflask Agent
            </label>
            {starflaskAgents && starflaskAgents.length > 0 ? (
              <div className="space-y-1">
                {starflaskAgents.map((a) => (
                  <button
                    key={a.id}
                    className={cn(
                      "flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-md border transition-colors",
                      starflaskAgentId === a.id
                        ? "border-cyan-500 bg-cyan-500/5"
                        : "border-border hover:bg-accent/50"
                    )}
                    onClick={() => setStarflaskAgentId(a.id)}
                  >
                    <Zap className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      starflaskAgentId === a.id ? "text-cyan-500" : "text-muted-foreground"
                    )} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {a.description}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                        {a.id}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : starflaskAgentsLoading ? (
              <p className="text-xs text-muted-foreground">Loading agents...</p>
            ) : starflaskApiKey.length > 8 ? (
              <p className="text-xs text-muted-foreground">
                No agents found. Check your API key and URL.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Enter your API key above to see available agents.
              </p>
            )}
          </div>

          {/* Persona (optional) */}
          <div className="px-4 py-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Persona <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <input
              className={inputClass}
              placeholder="e.g. worker, manager, analyst"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Axoniac persona to use when this agent runs heartbeats. Leave blank for default.
            </p>
          </div>
        </div>

        {/* Name */}
        <div className="px-4 pt-4 pb-2">
          <input
            className="w-full text-lg font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50"
            placeholder="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Title */}
        <div className="px-4 pb-2">
          <input
            className="w-full bg-transparent outline-none text-sm text-muted-foreground placeholder:text-muted-foreground/40"
            placeholder="Title (e.g. VP of Engineering)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Property chips: Role + Reports To */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-border flex-wrap">
          <Popover open={roleOpen} onOpenChange={setRoleOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50 transition-colors",
                  isFirstAgent && "opacity-60 cursor-not-allowed"
                )}
                disabled={isFirstAgent}
              >
                <Shield className="h-3 w-3 text-muted-foreground" />
                {roleLabels[effectiveRole] ?? effectiveRole}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start">
              {AGENT_ROLES.map((r) => (
                <button
                  key={r}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50",
                    r === role && "bg-accent"
                  )}
                  onClick={() => { setRole(r); setRoleOpen(false); }}
                >
                  {roleLabels[r] ?? r}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={reportsToOpen} onOpenChange={setReportsToOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50 transition-colors",
                  isFirstAgent && "opacity-60 cursor-not-allowed"
                )}
                disabled={isFirstAgent}
              >
                {currentReportsTo ? (
                  <>
                    <AgentIcon icon={currentReportsTo.icon} className="h-3 w-3 text-muted-foreground" />
                    {`Reports to ${currentReportsTo.name}`}
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 text-muted-foreground" />
                    {isFirstAgent ? "Reports to: N/A (CEO)" : "Reports to..."}
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <button
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50",
                  !reportsTo && "bg-accent"
                )}
                onClick={() => { setReportsTo(""); setReportsToOpen(false); }}
              >
                No manager
              </button>
              {(agents ?? []).map((a) => (
                <button
                  key={a.id}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50 truncate",
                    a.id === reportsTo && "bg-accent"
                  )}
                  onClick={() => { setReportsTo(a.id); setReportsToOpen(false); }}
                >
                  <AgentIcon icon={a.icon} className="shrink-0 h-3 w-3 text-muted-foreground" />
                  {a.name}
                  <span className="text-muted-foreground ml-auto">{roleLabels[a.role] ?? a.role}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          {isFirstAgent && (
            <p className="text-xs text-muted-foreground mb-2">This will be the CEO</p>
          )}
          {formError && (
            <p className="text-xs text-destructive mb-2">{formError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/agents")}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || createAgent.isPending}
              onClick={handleSubmit}
            >
              {createAgent.isPending ? "Creating…" : "Connect agent"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
