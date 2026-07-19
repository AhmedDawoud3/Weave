import { describe, it, expect } from "vitest";
import { TEMPLATES } from "../config/templates";

describe("TEMPLATES Configuration", () => {
  it("includes the working Decoder-Only Transformer (Mini-GPT) template", () => {
    const transformerTmpl = TEMPLATES.find(t => t.name.includes("Decoder-Only Transformer"));
    expect(transformerTmpl).toBeDefined();
    expect(transformerTmpl?.nodes.length).toBeGreaterThan(5);
  });

  it("all templates have non-empty nodes and edges", () => {
    TEMPLATES.forEach(t => {
      expect(t.name).toBeTruthy();
      expect(t.nodes.length).toBeGreaterThan(0);
      expect(t.edges.length).toBeGreaterThan(0);
    });
  });
});
