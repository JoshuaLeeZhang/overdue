import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	contexts: defineTable({
		pages: v.array(
			v.object({
				url: v.string(),
				title: v.string(),
				text: v.string(),
			}),
		),
	}),
	courses: defineTable({
		courseId: v.string(),
		name: v.string(),
		url: v.optional(v.string()),
		semester: v.optional(v.string()),
		scrapedAt: v.string(),
	}).index("by_courseId", ["courseId"]),
	assignments: defineTable({
		courseId: v.string(),
		courseName: v.string(),
		title: v.string(),
		dueDate: v.optional(v.string()),
		status: v.optional(v.string()),
		description: v.optional(v.string()),
		url: v.optional(v.string()),
		scrapedAt: v.string(),
	}).index("by_courseId", ["courseId"]),
});
