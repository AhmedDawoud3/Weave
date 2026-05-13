import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Schema for node and edge data
const nodeSchema = v.object({
  id: v.string(),
  type: v.string(),
  position: v.object({ x: v.number(), y: v.number() }),
  data: v.any(),
});

const edgeSchema = v.object({
  id: v.string(),
  source: v.string(),
  target: v.string(),
});

// Save a new module to the library
export const saveModule = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    nodes: v.array(nodeSchema),
    edges: v.array(edgeSchema),
    inputCount: v.number(),
    outputCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if module with same name exists
    const existing = await ctx.db
      .query("modules")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      // Update existing module
      await ctx.db.patch(existing._id, {
        description: args.description,
        nodes: args.nodes,
        edges: args.edges,
        inputCount: args.inputCount,
        outputCount: args.outputCount,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new module
    const moduleId = await ctx.db.insert("modules", {
      name: args.name,
      description: args.description,
      nodes: args.nodes,
      edges: args.edges,
      inputCount: args.inputCount,
      outputCount: args.outputCount,
      createdAt: now,
      updatedAt: now,
    });

    return moduleId;
  },
});

// List all saved modules
export const listModules = query({
  args: {},
  handler: async (ctx) => {
    const modules = await ctx.db.query("modules").order("desc").collect();
    return modules.map((m) => ({
      id: m._id,
      name: m.name,
      description: m.description,
      inputCount: m.inputCount,
      outputCount: m.outputCount,
      nodes: m.nodes,
      edges: m.edges,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  },
});

// Get a single module by ID
export const getModule = query({
  args: { id: v.id("modules") },
  handler: async (ctx, args) => {
    const module = await ctx.db.get(args.id);
    if (!module) return null;
    
    return {
      id: module._id,
      name: module.name,
      description: module.description,
      inputCount: module.inputCount,
      outputCount: module.outputCount,
      nodes: module.nodes,
      edges: module.edges,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    };
  },
});

// Delete a module from the library
export const deleteModule = mutation({
  args: { id: v.id("modules") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
