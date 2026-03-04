import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertCourse = mutation({
	args: {
		courseId: v.string(),
		name: v.string(),
		url: v.optional(v.string()),
		semester: v.optional(v.string()),
		scrapedAt: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("courses")
			.withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
			.first();
		if (existing) {
			await ctx.db.patch(existing._id, {
				name: args.name,
				url: args.url ?? existing.url,
				semester: args.semester ?? existing.semester,
				scrapedAt: args.scrapedAt,
			});
			return existing._id;
		}
		return await ctx.db.insert("courses", args);
	},
});

export const upsertAssignment = mutation({
	args: {
		courseId: v.string(),
		courseName: v.string(),
		title: v.string(),
		dueDate: v.optional(v.string()),
		status: v.optional(v.string()),
		description: v.optional(v.string()),
		url: v.optional(v.string()),
		scrapedAt: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("assignments")
			.withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
			.filter((q) => q.eq(q.field("title"), args.title))
			.first();
		if (existing) {
			await ctx.db.patch(existing._id, {
				dueDate: args.dueDate ?? existing.dueDate,
				status: args.status ?? existing.status,
				description: args.description ?? existing.description,
				url: args.url ?? existing.url,
				scrapedAt: args.scrapedAt,
			});
			return existing._id;
		}
		return await ctx.db.insert("assignments", args);
	},
});

export const listCourses = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("courses").collect();
	},
});

export const listAssignments = query({
	args: { courseId: v.optional(v.string()) },
	handler: async (ctx, { courseId }) => {
		if (courseId) {
			return await ctx.db
				.query("assignments")
				.withIndex("by_courseId", (q) => q.eq("courseId", courseId))
				.collect();
		}
		return await ctx.db.query("assignments").collect();
	},
});

export const listAll = query({
	args: {},
	handler: async (ctx) => {
		const courses = await ctx.db.query("courses").collect();
		const assignments = await ctx.db.query("assignments").collect();
		return { courses, assignments };
	},
});
