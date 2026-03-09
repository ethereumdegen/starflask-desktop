import { useDialog } from "../context/DialogContext";
import { useNavigate } from "@/lib/router";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function NewAgentDialog() {
  const { newAgentOpen, closeNewAgent } = useDialog();
  const navigate = useNavigate();

  function handleCreate() {
    closeNewAgent();
    navigate("/agents/new?adapterType=starflask");
  }

  return (
    <Dialog
      open={newAgentOpen}
      onOpenChange={(open) => {
        if (!open) closeNewAgent();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-sm text-muted-foreground">Add a new agent</span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={closeNewAgent}
          >
            <span className="text-lg leading-none">&times;</span>
          </Button>
        </div>

        <div className="p-6 space-y-6">
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

          <Button className="w-full" size="lg" onClick={handleCreate}>
            <Zap className="h-4 w-4 mr-2" />
            Connect Starflask Agent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
