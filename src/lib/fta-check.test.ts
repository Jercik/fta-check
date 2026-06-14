import { describe, it, expect } from "vitest";
import { parseThresholdValue } from "./fta-check.js";

describe("parseThresholdValue", () => {
  it("parses valid values", () => {
    expect(parseThresholdValue("42")).toBe(42);
  });

  it("rejects empty values", () => {
    expect(() => parseThresholdValue("  ")).toThrow(
      "--threshold requires a non-empty value (e.g., --threshold=55)",
    );
  });

  it("rejects non-positive numbers", () => {
    expect(() => parseThresholdValue("0")).toThrow("--threshold must be a positive number");
  });
});
