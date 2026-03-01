"use client";

import { Bot, CheckCircle2, FileSearch, Loader2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "@/lib/utils";

type AgentEvent = {
	id: string;
	action: string;
	detail: string;
	time: string;
	type: "processing" | "completed" | "review" | "system";
};

const recentActivity: AgentEvent[] = [
	{
		id: "1",
		action: "Auto-completing assignment",
		detail: "Discussion Board Post #8 - PSY 101",
		time: "Now",
		type: "processing",
	},
	{
		id: "2",
		action: "Reviewing submission",
		detail: "Lab Report - CHEM 201 against rubric",
		time: "2m ago",
		type: "review",
	},
	{
		id: "3",
		action: "Completed assignment",
		detail: "Weekly Reflection Journal - PSY 101",
		time: "15m ago",
		type: "completed",
	},
	{
		id: "4",
		action: "Completed quiz",
		detail: "Module 5 Quiz - CS 110 (Score: 92%)",
		time: "1h ago",
		type: "completed",
	},
	{
		id: "5",
		action: "Urgency detected",
		detail: "Homework Set #7 - MATH 260 due in 4h",
		time: "1h ago",
		type: "system",
	},
	{
		id: "6",
		action: "Synced course data",
		detail: "6 courses updated, 3 new assignments found",
		time: "2h ago",
		type: "system",
	},
];

const typeConfig = {
	processing: { icon: Loader2, className: "text-chart-2", animate: true },
	completed: { icon: CheckCircle2, className: "text-primary", animate: false },
	review: { icon: FileSearch, className: "text-chart-3", animate: false },
	system: { icon: Zap, className: "text-muted-foreground", animate: false },
};

export function AgentActivity() {
	return (
		<Card className="gap-4 py-4">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Bot className="size-4 text-primary" />
					Agent Activity
					<span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-primary">
						<span className="relative flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-primary" />
						</span>
						Live
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-1">
					{recentActivity.map((event) => {
						const config = typeConfig[event.type];
						const Icon = config.icon;
						return (
							<div
								key={event.id}
								className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-accent"
							>
								<div className={cn("mt-0.5", config.className)}>
									<Icon
										className={cn("size-3.5", config.animate && "animate-spin")}
									/>
								</div>
								<div className="flex flex-1 flex-col">
									<span className="text-xs font-medium text-foreground">
										{event.action}
									</span>
									<span className="text-xs text-muted-foreground">
										{event.detail}
									</span>
								</div>
								<span className="shrink-0 text-[10px] text-muted-foreground">
									{event.time}
								</span>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
