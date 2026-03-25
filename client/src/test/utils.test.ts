import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";

describe("cn (classname merge utility)", () => {
  it("merges class strings", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    const active = true;
    expect(cn("base", active && "active")).toBe("base active");
    expect(cn("base", false && "hidden")).toBe("base");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  it("returns empty string when no arguments", () => {
    expect(cn()).toBe("");
  });
});
