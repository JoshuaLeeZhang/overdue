"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { BookOpen } from "lucide-react";

type Course = {
	name: string;
	code: string;
	progress: number;
	assignmentsDone: number;
	assignmentsTotal: number;
};

const courses: Course[] = [
	{
		name: "Intro to Psychology",
		code: "PSY 101",
		progress: 72,
		assignmentsDone: 18,
		assignmentsTotal: 25,
	},
	{
		name: "Organic Chemistry",
		code: "CHEM 201",
		progress: 58,
		assignmentsDone: 14,
		assignmentsTotal: 24,
	},
	{
		name: "American History",
		code: "HIST 150",
		progress: 80,
		assignmentsDone: 20,
		assignmentsTotal: 25,
	},
	{
		name: "Creative Writing II",
		code: "ENG 202",
		progress: 65,
		assignmentsDone: 13,
		assignmentsTotal: 20,
	},
	{
		name: "Linear Algebra",
		code: "MATH 260",
		progress: 44,
		assignmentsDone: 11,
		assignmentsTotal: 25,
	},
	{
		name: "Intro to CS",
		code: "CS 110",
		progress: 88,
		assignmentsDone: 22,
		assignmentsTotal: 25,
	},
];

export function CourseOverview({ 
	searchQuery = "",
	variant = "card"
}: { 
	searchQuery?: string;
	variant?: "card" | "page";
}) {
	const filtered = courses.filter((course) => {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		return course.name.toLowerCase().includes(q) || course.code.toLowerCase().includes(q);
	});

	if (searchQuery && filtered.length === 0) return null;

	const content = (
		<div className="flex flex-col gap-3">
			{filtered.map((course) => (
				<div key={course.code} className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-xs font-semibold text-foreground">
								{course.code}
							</span>
							<span className="text-xs text-muted-foreground">
								{course.name}
							</span>
						</div>
						<span className="text-xs tabular-nums text-muted-foreground">
							{course.assignmentsDone}/{course.assignmentsTotal}
						</span>
					</div>
					<Progress value={course.progress} className="h-1.5" />
				</div>
			))}
		</div>
	);

	if (variant === "page") {
		return (
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-1">
					<h2 className="text-2xl font-bold tracking-tight text-foreground">Course Progress</h2>
					<p className="text-sm text-muted-foreground">Track your academic success across all enrolled courses.</p>
				</div>
				{content}
			</div>
		);
	}

	return (
		<Card className="gap-4 py-4">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center gap-2 text-sm">
					<BookOpen className="size-4 text-muted-foreground" />
					Course Progress
				</CardTitle>
			</CardHeader>
			<CardContent>
				{content}
			</CardContent>
		</Card>
	);
}
