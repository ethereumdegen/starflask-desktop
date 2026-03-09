import { useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bot,
  Code,
  MousePointer2,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OpenCodeLogoIcon } from "./OpenCodeLogoIcon";

type AdapterType =
  | "starflask"
  | "claude_local"
  | "codex_local"
  | "opencode_local"
  | "pi_local"
  | "cursor"
  | "openclaw_gateway";

const LOCAL_ADAPTER_OPTIONS: Array<{
  value: AdapterType;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    value: "claude_local",
    label: "Claude Code",
    icon: Sparkles,
    desc: "Local Claude agent",
  },
  {
    value: "codex_local",
    label: "Codex",
    icon: Code,
    desc: "Local Codex agent",
  },
  {
    value: "opencode_local",
    label: "OpenCode",
    icon: OpenCodeLogoIcon,
    desc: "Local multi-provider agent",
  },
  {
    value: "pi_local",
    label: "Pi",
    icon: Terminal,
    desc: "Local Pi agent",
  },
  {
    value: "cursor",
    label: "Cursor",
    icon: MousePointer2,
    desc: "Local Cursor agent",
  },
  {
    value: "openclaw_gateway",
    label: "OpenClaw Gateway",
    icon: Bot,
    desc: "Invoke OpenClaw via gateway",
  },
];

export function NewAgentDialog() {
  const { newAgentOpen, closeNewAgent } = useDialog();
  const { selectedCompanyId } = useCompany();
  const navigate = useNavigate();
  const [showLocalAdapters, setShowLocalAdapters] = useState(false);

  function handleStarflask() {
    closeNewAgent();
    setShowLocalAdapters(false);
    navigate("/agents/new?adapterType=starflask");
  }

  function handleLocalAdapterPick(adapterType: AdapterType) {
    closeNewAgent();
    setShowLocalAdapters(false);
    navigate(`/agents/new?adapterType=${encodeURIComponent(adapterType)}`);
  }

  return (
    <Dialog
      open={newAgentOpen}
      onOpenChange={(open) => {
        if (!open) {
          setShowLocalAdapters(false);
          closeNewAgent();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-sm text-muted-foreground">Add a new agent</span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => {
              setShowLocalAdapters(false);
              closeNewAgent();
            }}
          >
            <span className="text-lg leading-none">&times;</span>
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {!showLocalAdapters ? (
            <>
              {/* Starflask agent — primary action */}
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
                  <Zap className="h-6 w-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Connect a Starflask Agent</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Link an existing agent from your Starflask backend.
                    Runs via Starflask's session worker with Axoniac packs.
                  </p>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleStarflask}>
                <Zap className="h-4 w-4 mr-2" />
                Connect Starflask Agent
              </Button>

              {/* Local adapter link */}
              <div className="text-center">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  onClick={() => setShowLocalAdapters(true)}
                >
                  Or use a local adapter (Claude Code, Codex, Cursor...)
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <button
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowLocalAdapters(false)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <p className="text-sm text-muted-foreground">
                  Choose a local adapter to run on this machine.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {LOCAL_ADAPTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border border-border p-3 text-xs transition-colors hover:bg-accent/50 relative"
                    )}
                    onClick={() => handleLocalAdapterPick(opt.value)}
                  >
                    <opt.icon className="h-4 w-4" />
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
