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
