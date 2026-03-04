/**
 * Assignments store: persists scraped courses & assignments to Convex (or in-memory fallback).
 */

export interface CourseRecord {
	courseId: string;
	name: string;
	url?: string;
	semester?: string;
}

export interface AssignmentRecord {
	courseId: string;
	courseName: string;
	title: string;
	dueDate?: string;
	status?: string;
	description?: string;
	url?: string;
}

export interface AssignmentsStore {
	upsertCourse(course: CourseRecord): Promise<void>;
	upsertAssignment(assignment: AssignmentRecord): Promise<void>;
	listCourses(): Promise<CourseRecord[]>;
	listAssignments(courseId?: string): Promise<AssignmentRecord[]>;
}

const memoryCourses = new Map<string, CourseRecord>();
const memoryAssignments: AssignmentRecord[] = [];

const memoryStore: AssignmentsStore = {
	async upsertCourse(course) {
		memoryCourses.set(course.courseId, course);
	},
	async upsertAssignment(assignment) {
		const idx = memoryAssignments.findIndex(
			(a) =>
				a.courseId === assignment.courseId && a.title === assignment.title,
		);
		if (idx >= 0) {
			memoryAssignments[idx] = assignment;
		} else {
			memoryAssignments.push(assignment);
		}
	},
	async listCourses() {
		return Array.from(memoryCourses.values());
	},
	async listAssignments(courseId?: string) {
		if (courseId) {
			return memoryAssignments.filter((a) => a.courseId === courseId);
		}
		return [...memoryAssignments];
	},
};

function getConvexUrl(): string | null {
	const url = process.env.CONVEX_URL;
	if (url) return url;
	const deployment = process.env.CONVEX_DEPLOYMENT;
	if (deployment) {
		if (deployment.startsWith("anonymous:")) {
			return process.env.VITE_CONVEX_URL || "http://127.0.0.1:3210";
		}
		const name = deployment.replace(/^(dev|production):/, "");
		return `https://${name}.convex.cloud`;
	}
	return null;
}

async function createConvexAssignmentsStore(): Promise<AssignmentsStore | null> {
	const url = getConvexUrl();
	if (!url) return null;

	try {
		const { ConvexHttpClient } = await import("convex/browser");
		const client = new ConvexHttpClient(url) as {
			mutation: (name: string, args: object) => Promise<unknown>;
			query: (name: string, args: object) => Promise<unknown>;
		};

		return {
			async upsertCourse(course) {
				await client.mutation("assignments:upsertCourse", {
					...course,
					scrapedAt: new Date().toISOString(),
				});
			},
			async upsertAssignment(assignment) {
				await client.mutation("assignments:upsertAssignment", {
					...assignment,
					scrapedAt: new Date().toISOString(),
				});
			},
			async listCourses() {
				const rows = (await client.query(
					"assignments:listCourses",
					{},
				)) as (CourseRecord & { _id: string })[];
				return rows.map(({ _id, ...rest }) => rest);
			},
			async listAssignments(courseId?: string) {
				const rows = (await client.query("assignments:listAssignments", {
					courseId,
				})) as (AssignmentRecord & { _id: string })[];
				return rows.map(({ _id, ...rest }) => rest);
			},
		};
	} catch (err) {
		if (process.env.CONVEX_URL || process.env.CONVEX_DEPLOYMENT) {
			console.warn(
				"Convex assignments store unavailable, using in-memory:",
				(err as Error).message,
			);
		}
		return null;
	}
}

let assignmentsStore: AssignmentsStore | null = null;

export async function getAssignmentsStore(): Promise<AssignmentsStore> {
	if (assignmentsStore) return assignmentsStore;
	assignmentsStore =
		(await createConvexAssignmentsStore()) ?? memoryStore;
	return assignmentsStore;
}
