"use client";

import { Bot, CheckCircle2, Clock, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { type PipelineTask, tasks } from "@/lib/tasks-data";

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
};

function PipelineItem({ task }: { task: PipelineTask }) {
	const config = statusConfig[task.status];
	const StatusIcon = config.icon;

	return (
		<div
			className={cn(
				"group flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent",
				task.status === "urgent" && "border-destructive/30",
			)}
		>
			<div className="flex items-center gap-3">
				<div
					className={cn(
						"flex size-8 items-center justify-center rounded-md bg-secondary",
						config.className,
					)}
				>
					<StatusIcon
						className={cn(
							"size-4",
							task.status === "processing" && "animate-spin",
						)}
					/>
				</div>
				<div className="flex flex-col">
					<span className="text-sm font-medium text-foreground">
						{task.title}
					</span>
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">{task.course}</span>
						<span className="text-xs text-muted-foreground/50">{"/"}</span>
						<span className="text-xs text-muted-foreground">{task.type}</span>
					</div>
				</div>
			</div>
			<div className="flex items-center gap-3">
				<span
					className={cn(
						"text-xs",
						task.status === "urgent"
							? "text-destructive font-medium"
							: "text-muted-foreground",
					)}
				>
					{task.dueDate}
				</span>
				<Badge
					variant="outline"
					className={cn("text-[10px] px-1.5", config.badgeClass)}
				>
					{config.label}
				</Badge>
			</div>
		</div>
	);
}

function matchesQuery(task: PipelineTask, q: string) {
	if (!q) return true;
	const lower = q.toLowerCase();
	return (
		task.title.toLowerCase().includes(lower) ||
		task.course.toLowerCase().includes(lower) ||
		task.type.toLowerCase().includes(lower) ||
		task.status.toLowerCase().includes(lower)
	);
}

interface PipelineViewProps {
	searchQuery?: string;
}

export function PipelineView({ searchQuery = "" }: PipelineViewProps) {
	const filtered = tasks.filter((t) => matchesQuery(t, searchQuery));

	const processingTasks = filtered.filter(
		(t) => t.status === "processing" || t.status === "urgent",
	);
	const queuedTasks = filtered.filter((t) => t.status === "queued");
	const completedTasks = filtered.filter((t) => t.status === "completed");

	const noResults = searchQuery && filtered.length === 0;

	return (
		<div className="flex flex-col gap-6">
			{noResults ? (
				<p className="py-6 text-center text-sm text-muted-foreground">
					No tasks match &ldquo;{searchQuery}&rdquo;
				</p>
			) : (
				<>
					{/* Active / Urgent */}
					{processingTasks.length > 0 && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2 px-1">
								<Bot className="size-4 text-primary" />
								<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Active
								</h3>
								<Badge
									variant="outline"
									className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5"
								>
									{processingTasks.length}
								</Badge>
							</div>
							<div className="flex flex-col gap-1.5">
								{processingTasks.map((task) => (
									<PipelineItem key={task.id} task={task} />
								))}
							</div>
						</div>
					)}

					{/* Queued */}
					{queuedTasks.length > 0 && (
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
					)}

					{/* Completed */}
					{completedTasks.length > 0 && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2 px-1">
								<CheckCircle2 className="size-4 text-primary/70" />
								<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Completed
								</h3>
								<Badge
									variant="outline"
									className="bg-primary/10 text-primary/70 border-primary/20 text-[10px] px-1.5"
								>
									{completedTasks.length}
								</Badge>
							</div>
							<div className="flex flex-col gap-1.5">
								{completedTasks.map((task) => (
									<PipelineItem key={task.id} task={task} />
								))}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
