import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  contexts: defineTable({
    pages: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        text: v.string(),
      })
    ),
  }),
});
