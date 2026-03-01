export type PipelineTask = {
	id: string;
	title: string;
	course: string;
	status: "queued" | "processing" | "completed" | "urgent";
	dueDate: string;
	type: string;
};

export const tasks: PipelineTask[] = [
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
];

export type Course = {
	name: string;
	code: string;
	progress: number;
	assignmentsDone: number;
	assignmentsTotal: number;
};

export const courses: Course[] = [
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

export type Deadline = {
	title: string;
	course: string;
	due: string;
	urgent: boolean;
};

export const upcomingDeadlines: Deadline[] = [
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

export function searchTasks(query: string): PipelineTask[] {
	if (!query.trim()) return [];
	const q = query.toLowerCase();
	return tasks.filter(
		(t) =>
			t.title.toLowerCase().includes(q) ||
			t.course.toLowerCase().includes(q) ||
			t.type.toLowerCase().includes(q) ||
			t.status.toLowerCase().includes(q),
	);
}
