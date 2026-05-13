import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all graphs
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("graphs").collect();
  },
});

// Get a single graph by ID
export const get = query({
  args: { id: v.id("graphs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Save a new graph
export const save = mutation({
  args: {
    name: v.string(),
    nodes: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        position: v.object({ x: v.number(), y: v.number() }),
        data: v.any(),
      })
    ),
    edges: v.array(
      v.object({
        id: v.string(),
        source: v.string(),
        target: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("graphs", {
      name: args.name,
      nodes: args.nodes,
      edges: args.edges,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing graph
export const update = mutation({
  args: {
    id: v.id("graphs"),
    name: v.optional(v.string()),
    nodes: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.string(),
          position: v.object({ x: v.number(), y: v.number() }),
          data: v.any(),
        })
      )
    ),
    edges: v.optional(
      v.array(
        v.object({
          id: v.string(),
          source: v.string(),
          target: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a graph
export const remove = mutation({
  args: { id: v.id("graphs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
