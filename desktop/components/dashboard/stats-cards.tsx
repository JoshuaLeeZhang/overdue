"use client";

import {
	ListTodo,
	CheckCircle2,
	Clock,
	AlertTriangle,
	BookOpen,
	CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "@/lib/utils";

type StatCard = {
	title: string;
	value: string;
	subtitle: string;
	icon: React.ElementType;
	trend?: string;
	trendDirection?: "up" | "down" | "neutral";
};

const stats: StatCard[] = [
	{
		title: "Active Tasks",
		value: "3",
		subtitle: "2 processing, 1 urgent",
		icon: ListTodo,
		trend: "+2 today",
		trendDirection: "neutral",
	},
	{
		title: "Completed",
		value: "12",
		subtitle: "This week",
		icon: CheckCircle2,
		trend: "+5 from last week",
		trendDirection: "up",
	},
	{
		title: "Upcoming",
		value: "5",
		subtitle: "Due in next 48h",
		icon: Clock,
		trend: "2 due today",
		trendDirection: "neutral",
	},
	{
		title: "Courses",
		value: "6",
		subtitle: "All synced",
		icon: BookOpen,
		trend: "Last sync: 5m ago",
		trendDirection: "neutral",
	},
];

export function StatsCards({ searchQuery = "" }: { searchQuery?: string }) {
	const filtered = stats.filter((stat) => {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		return stat.title.toLowerCase().includes(q) || stat.subtitle.toLowerCase().includes(q);
	});

	if (searchQuery && filtered.length === 0) return null;

	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{filtered.map((stat) => (
				<Card key={stat.title} className="gap-4 py-4">
					<CardHeader className="pb-0">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								{stat.title}
							</span>
							<stat.icon className="size-4 text-muted-foreground" />
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-1">
						<span className="text-2xl font-bold tracking-tight text-foreground">
							{stat.value}
						</span>
						<span className="text-xs text-muted-foreground">
							{stat.subtitle}
						</span>
						{stat.trend && (
							<span
								className={cn(
									"mt-1 text-xs",
									stat.trendDirection === "up" && "text-primary",
									stat.trendDirection === "down" && "text-destructive",
									stat.trendDirection === "neutral" && "text-muted-foreground",
								)}
							>
								{stat.trend}
							</span>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

const upcomingDeadlines = [
	{
		title: "Homework Set #7",
		course: "MATH 260",
		due: "Today 6:00 PM",
		urgent: true,
	},
	{
		title: "Discussion Board Post #8",
		course: "PSY 101",
		due: "Today 11:59 PM",
		urgent: true,
	},
	{
		title: "Lab Report Review",
		course: "CHEM 201",
		due: "Tomorrow 5:00 PM",
		urgent: false,
	},
	{
		title: "Reading Quiz Ch. 12",
		course: "HIST 150",
		due: "Mar 2",
		urgent: false,
	},
	{
		title: "Peer Review Draft",
		course: "ENG 202",
		due: "Mar 3",
		urgent: false,
	},
];

export function DeadlinesList({ 
	searchQuery = "", 
	variant = "card" 
}: { 
	searchQuery?: string;
	variant?: "card" | "page";
}) {
	const filtered = upcomingDeadlines.filter((item) => {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		return (
			item.title.toLowerCase().includes(q) ||
			item.course.toLowerCase().includes(q) ||
			(item.urgent && "urgent".includes(q))
		);
	});

	const content = (
		<div className="flex flex-col gap-2">
			{filtered.length === 0 ? (
				<p className="py-4 text-center text-sm text-muted-foreground">
					No deadlines match &ldquo;{searchQuery}&rdquo;
				</p>
			) : (
				filtered.map((item, i) => (
					<div
						key={i}
						className={cn(
							"flex items-center justify-between rounded-md border border-border p-2.5 transition-colors hover:bg-accent",
							item.urgent && "border-destructive/30 bg-destructive/5",
						)}
					>
						<div className="flex items-center gap-2.5">
							{item.urgent ? (
								<AlertTriangle className="size-3.5 text-destructive" />
							) : (
								<Clock className="size-3.5 text-muted-foreground" />
							)}
							<div className="flex flex-col">
								<span className="text-sm font-medium text-foreground">
									{item.title}
								</span>
								<span className="text-xs text-muted-foreground">
									{item.course}
								</span>
							</div>
						</div>
						<span
							className={cn(
								"text-xs font-medium",
								item.urgent ? "text-destructive" : "text-muted-foreground",
							)}
						>
							{item.due}
						</span>
					</div>
				))
			)}
		</div>
	);

	if (variant === "page") {
		return (
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-1">
					<h2 className="text-2xl font-bold tracking-tight text-foreground">Upcoming Deadlines</h2>
					<p className="text-sm text-muted-foreground">Keep track of your upcoming academic commitments.</p>
				</div>
				{content}
			</div>
		);
	}

	return (
		<Card className="gap-4 py-4">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center gap-2 text-sm">
					<CalendarClock className="size-4 text-muted-foreground" />
					Upcoming Deadlines
				</CardTitle>
			</CardHeader>
			<CardContent>
				{content}
			</CardContent>
		</Card>
	);
}
