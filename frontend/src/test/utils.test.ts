import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names correctly", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes via clsx", () => {
    const condition = false;
    expect(cn("base", condition && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind conflicts via twMerge", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null inputs gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});
