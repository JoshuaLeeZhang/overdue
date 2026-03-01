import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const store = mutation({
  args: {
    pages: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        text: v.string(),
      })
    ),
  },
  handler: async (ctx, { pages }) => {
    return await ctx.db.insert('contexts', { pages });
  },
});

export const get = query({
  args: { id: v.id('contexts') },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    return doc ?? null;
  },
});
