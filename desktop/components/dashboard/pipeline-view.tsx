"use client"

import { Bot, CheckCircle2, Clock, Loader2, AlertTriangle } from "lucide-react"
import { Badge } from "../ui/badge"
import { cn } from "@/lib/utils"

type PipelineTask = {
  id: string
  title: string
  course: string
  status: "queued" | "processing" | "completed" | "urgent"
  dueDate: string
  type: string
}

const tasks: PipelineTask[] = [
  {
    id: "1",
    title: "Discussion Board Post #8",
    course: "PSY 101",
    status: "processing",
    dueDate: "Today 11:59 PM",
    type: "Auto-complete",
  },
  {
    id: "2",
    title: "Lab Report Review",
    course: "CHEM 201",
    status: "processing",
    dueDate: "Tomorrow 5:00 PM",
    type: "Rubric Review",
  },
  {
    id: "3",
    title: "Reading Quiz Ch. 12",
    course: "HIST 150",
    status: "queued",
    dueDate: "Mar 2, 11:59 PM",
    type: "Auto-complete",
  },
  {
    id: "4",
    title: "Peer Review Draft",
    course: "ENG 202",
    status: "queued",
    dueDate: "Mar 3, 9:00 AM",
    type: "Rubric Review",
  },
  {
    id: "5",
    title: "Homework Set #7",
    course: "MATH 260",
    status: "urgent",
    dueDate: "Today 6:00 PM",
    type: "Auto-complete",
  },
  {
    id: "6",
    title: "Weekly Reflection Journal",
    course: "PSY 101",
    status: "completed",
    dueDate: "Submitted",
    type: "Auto-complete",
  },
  {
    id: "7",
    title: "Module 5 Quiz",
    course: "CS 110",
    status: "completed",
    dueDate: "Submitted",
    type: "Auto-complete",
  },
]

const statusConfig = {
  queued: {
    icon: Clock,
    label: "Queued",
    className: "text-muted-foreground",
    badgeClass: "bg-secondary text-secondary-foreground",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    className: "text-chart-2",
    badgeClass: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-primary",
    badgeClass: "bg-primary/15 text-primary border-primary/20",
  },
  urgent: {
    icon: AlertTriangle,
    label: "Urgent",
    className: "text-destructive",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/20",
  },
}

function PipelineItem({ task }: { task: PipelineTask }) {
  const config = statusConfig[task.status]
  const StatusIcon = config.icon

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent",
        task.status === "urgent" && "border-destructive/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("flex size-8 items-center justify-center rounded-md bg-secondary", config.className)}>
          <StatusIcon className={cn("size-4", task.status === "processing" && "animate-spin")} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{task.title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{task.course}</span>
            <span className="text-xs text-muted-foreground/50">{"/"}</span>
            <span className="text-xs text-muted-foreground">{task.type}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn(
          "text-xs",
          task.status === "urgent" ? "text-destructive font-medium" : "text-muted-foreground"
        )}>
          {task.dueDate}
        </span>
        <Badge variant="outline" className={cn("text-[10px] px-1.5", config.badgeClass)}>
          {config.label}
        </Badge>
      </div>
    </div>
  )
}

export function PipelineView() {
  const processingTasks = tasks.filter((t) => t.status === "processing" || t.status === "urgent")
  const queuedTasks = tasks.filter((t) => t.status === "queued")
  const completedTasks = tasks.filter((t) => t.status === "completed")

  return (
    <div className="flex flex-col gap-6">
      {/* Active / Urgent */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <Bot className="size-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active
          </h3>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5">
            {processingTasks.length}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          {processingTasks.map((task) => (
            <PipelineItem key={task.id} task={task} />
          ))}
        </div>
      </div>

      {/* Queued */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <Clock className="size-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Queued
          </h3>
          <Badge variant="outline" className="text-[10px] px-1.5">
            {queuedTasks.length}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          {queuedTasks.map((task) => (
            <PipelineItem key={task.id} task={task} />
          ))}
        </div>
      </div>

      {/* Completed */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <CheckCircle2 className="size-4 text-primary/70" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Completed
          </h3>
          <Badge variant="outline" className="bg-primary/10 text-primary/70 border-primary/20 text-[10px] px-1.5">
            {completedTasks.length}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          {completedTasks.map((task) => (
            <PipelineItem key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  )
}
