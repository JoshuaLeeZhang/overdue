import { useState, useEffect } from "react"
import { Bot, Play, Square, Loader2, Zap, Shield, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const { ipcRenderer } = require('electron')

type AgentState = "idle" | "starting" | "running" | "stopping"

interface AgentControlProps {
  onLogs?: (logs: string[]) => void
  onResult?: (result: { title?: string; text?: string }) => void
}

export function AgentControl({ onLogs, onResult }: AgentControlProps) {
  const [agentState, setAgentState] = useState<AgentState>("idle")

  useEffect(() => {
    const handleLog = (_event: any, message: string) => {
      // When we get the first log after starting, flip to "running"
      setAgentState((prev) => (prev === "starting" ? "running" : prev))
      onLogs?.([message])
    }

    const handleResult = (_event: any, data: any) => {
      onResult?.(data)
      setAgentState("idle")
    }

    const handleError = () => {
      setAgentState("idle")
    }

    ipcRenderer.on("agent:log", handleLog)
    ipcRenderer.on("agent:result", handleResult)
    ipcRenderer.on("agent:error", handleError)

    return () => {
      ipcRenderer.removeListener("agent:log", handleLog)
      ipcRenderer.removeListener("agent:result", handleResult)
      ipcRenderer.removeListener("agent:error", handleError)
    }
  }, [onLogs, onResult])

  function handleToggle() {
    if (agentState === "idle") {
      setAgentState("starting")
      ipcRenderer.send("agent:start")
    } else if (agentState === "running") {
      setAgentState("stopping")
      ipcRenderer.send("agent:stop")
      // Fallback: if no stop confirmation comes, reset after 1.5s
      setTimeout(() => setAgentState((prev) => (prev === "stopping" ? "idle" : prev)), 1500)
    }
  }

  const isActive = agentState === "running" || agentState === "starting"
  const isTransitioning = agentState === "starting" || agentState === "stopping"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-all duration-500",
        isActive
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      )}
    >
      {/* Subtle animated gradient when active */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-1/2 -left-1/2 size-full animate-spin rounded-full bg-[radial-gradient(circle,var(--color-primary)_0%,transparent_70%)] [animation-duration:8s]" />
        </div>
      )}

      <div className="relative flex items-center gap-4">
        {/* Agent icon with status ring */}
        <div className="relative">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-xl transition-colors duration-500",
              isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            {isTransitioning ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Bot className="size-5" />
            )}
          </div>
          {agentState === "running" && (
            <span className="absolute -top-1 -right-1 flex size-3.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-3.5 rounded-full border-2 border-card bg-primary" />
            </span>
          )}
        </div>

        {/* Status info */}
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {agentState === "idle" && "Agent Offline"}
              {agentState === "starting" && "Starting Agent..."}
              {agentState === "running" && "Agent Running"}
              {agentState === "stopping" && "Stopping Agent..."}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 transition-colors duration-500",
                agentState === "running" && "bg-primary/15 text-primary border-primary/20",
                agentState === "starting" && "bg-chart-3/15 text-chart-3 border-chart-3/20",
                agentState === "stopping" && "bg-destructive/15 text-destructive border-destructive/20",
                agentState === "idle" && "bg-secondary text-muted-foreground"
              )}
            >
              {agentState === "idle" && "Standby"}
              {agentState === "starting" && "Initializing"}
              {agentState === "running" && "Active"}
              {agentState === "stopping" && "Winding Down"}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {agentState === "idle" && "Start the agent to begin processing queued tasks and monitoring deadlines."}
            {agentState === "starting" && "Connecting to your courses and syncing assignments..."}
            {agentState === "running" && "Processing tasks. Monitoring courses for new deadlines."}
            {agentState === "stopping" && "Finishing current tasks before shutting down..."}
          </span>
        </div>

        {/* Trigger button */}
        <Button
          onClick={handleToggle}
          disabled={isTransitioning}
          size="lg"
          className={cn(
            "relative gap-2 px-6 font-semibold transition-all duration-300",
            isActive && !isTransitioning
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {agentState === "idle" && (<><Play className="size-4" />Start Agent</>)}
          {agentState === "starting" && (<><Loader2 className="size-4 animate-spin" />Starting...</>)}
          {agentState === "running" && (<><Square className="size-4" />Stop Agent</>)}
          {agentState === "stopping" && (<><Loader2 className="size-4 animate-spin" />Stopping...</>)}
        </Button>
      </div>

      {/* Quick stats bar when running */}
      {agentState === "running" && (
        <div className="relative mt-4 flex items-center gap-6 border-t border-primary/10 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="size-3 text-primary" />
            <span><span className="font-medium text-foreground">2</span> tasks processing</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3 text-chart-3" />
            <span><span className="font-medium text-foreground">2</span> queued</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="size-3 text-chart-2" />
            <span><span className="font-medium text-foreground">6</span> courses monitored</span>
          </div>
        </div>
      )}
    </div>
  )
}
