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
import { Shield, User, Zap, Plus } from "lucide-react";
import { cn, agentUrl } from "../lib/utils";
import { roleLabels } from "../components/agent-config-primitives";
import { AgentIcon } from "../components/AgentIconPicker";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

type AgentSource = "existing" | "new";

export function NewAgent() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [agentSource, setAgentSource] = useState<AgentSource>("existing");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("general");
  const [reportsTo, setReportsTo] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [reportsToOpen, setReportsToOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [starflaskAgentId, setStarflaskAgentId] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [personaName, setPersonaName] = useState("");

  // Fetch Starflask agents using stored credentials (proxied through server)
  const {
    data: starflaskAgents,
    isLoading: starflaskAgentsLoading,
  } = useQuery({
    queryKey: ["starflask-agents"],
    queryFn: async () => {
      const res = await fetch("/api/starflask-agents", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch agents (${res.status})`);
      return res.json() as Promise<Array<{ id: string; name: string; description?: string }>>;
    },
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

  // Create a new agent on Starflask, then use its ID
  const createStarflaskAgent = useMutation({
    mutationFn: async (agentName: string) => {
      const res = await fetch("/api/starflask-agents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: agentName }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to create agent (${res.status})`);
      }
      return res.json() as Promise<{ id: string; name: string }>;
    },
  });

  const createAgent = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      agentsApi.hire(selectedCompanyId!, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: ["starflask-agents"] });
      navigate(agentUrl(result.agent));
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to create agent");
    },
  });

  async function handleSubmit() {
    if (!selectedCompanyId || !name.trim()) return;
    setFormError(null);

    let agentId = starflaskAgentId.trim();

    if (agentSource === "new") {
      if (!newAgentName.trim()) { setFormError("Enter a name for the new Starflask agent"); return; }
      try {
        const created = await createStarflaskAgent.mutateAsync(newAgentName.trim());
        agentId = created.id;
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to create Starflask agent");
        return;
      }
    } else {
      if (!agentId) { setFormError("Select a Starflask agent"); return; }
    }

    createAgent.mutate({
      name: name.trim(),
      role: effectiveRole,
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(reportsTo ? { reportsTo } : {}),
      adapterType: "starflask",
      adapterConfig: {
        starflaskAgentId: agentId,
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

  const isPending = createAgent.isPending || createStarflaskAgent.isPending;
  const currentReportsTo = (agents ?? []).find((a) => a.id === reportsTo);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">
          <span className="inline-flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-500" />
            Add Agent
          </span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect an existing Starflask agent or create a new one.
        </p>
      </div>

      <div className="border border-border">
        {/* Source toggle */}
        <div className="flex border-b border-border">
          <button
            className={cn(
              "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
              agentSource === "existing"
                ? "bg-accent/50 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/25"
            )}
            onClick={() => setAgentSource("existing")}
          >
            Use Existing Agent
          </button>
          <button
            className={cn(
              "flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-l border-border",
              agentSource === "new"
                ? "bg-accent/50 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/25"
            )}
            onClick={() => setAgentSource("new")}
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3 w-3" />
              Create New Agent
            </span>
          </button>
        </div>

        <div className="border-b border-border">
          {agentSource === "existing" ? (
            <>
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
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No agents found. Try creating a new one instead.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Create new agent */}
              <div className="px-4 py-3 border-b border-border">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  New Agent Name
                </label>
                <input
                  className={inputClass}
                  placeholder="e.g. my-worker"
                  value={newAgentName}
                  onChange={(e) => {
                    setNewAgentName(e.target.value);
                    if (!name || name === newAgentName) setName(e.target.value);
                  }}
                  autoFocus
                  maxLength={32}
                />
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  A new agent will be created on Starflask with this name.
                </p>
              </div>
            </>
          )}

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
              disabled={!name.trim() || isPending}
              onClick={handleSubmit}
            >
              {isPending
                ? "Creating…"
                : agentSource === "new"
                  ? "Create & connect agent"
                  : "Connect agent"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
