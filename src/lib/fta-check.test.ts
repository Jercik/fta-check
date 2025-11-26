import { describe, it, expect } from "vitest";
import { parseThreshold, parseThresholdValue } from "./fta-check.js";

describe("parseThreshold", () => {
  it("returns 55 when no threshold argument is provided", () => {
    expect(parseThreshold([])).toBe(55);
    expect(parseThreshold(["--other-arg"])).toBe(55);
  });

  it("parses valid threshold values correctly", () => {
    expect(parseThreshold(["--threshold=100"])).toBe(100);
    expect(parseThreshold(["--threshold=25"])).toBe(25);
    expect(parseThreshold(["--other", "--threshold=75"])).toBe(75);
    expect(parseThreshold(["--threshold", "60"])).toBe(60);
  });

  it("throws error when threshold has no value", () => {
    expect(() => parseThreshold(["--threshold"])).toThrow(
      "--threshold requires a non-empty value (e.g., --threshold=50)",
    );
    expect(() => parseThreshold(["--threshold="])).toThrow(
      "--threshold requires a non-empty value (e.g., --threshold=50)",
    );
    expect(() => parseThreshold(["--threshold", "--other"])).toThrow(
      "--threshold requires a non-empty value (e.g., --threshold=50)",
    );
  });

  it("throws error when threshold is not a positive number", () => {
    expect(() => parseThreshold(["--threshold=0"])).toThrow(
      "--threshold must be a positive number",
    );
    expect(() => parseThreshold(["--threshold=-10"])).toThrow(
      "--threshold must be a positive number",
    );
    expect(() => parseThreshold(["--threshold=abc"])).toThrow(
      "--threshold must be a positive number",
    );
  });
});

describe("parseThresholdValue", () => {
  it("parses valid values", () => {
    expect(parseThresholdValue("42")).toBe(42);
  });

  it("rejects empty values", () => {
    expect(() => parseThresholdValue("  ")).toThrow(
      "--threshold requires a non-empty value (e.g., --threshold=50)",
    );
  });

  it("rejects non-positive numbers", () => {
    expect(() => parseThresholdValue("0")).toThrow(
      "--threshold must be a positive number",
    );
  });
});
