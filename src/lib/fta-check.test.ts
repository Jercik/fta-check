import { describe, it, expect } from "vitest";
import { buildFtaArguments, parseThresholdValue } from "./fta-check.js";

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

describe("buildFtaArguments", () => {
  it("injects --json and the config path, appending the default path when none is given", () => {
    expect(buildFtaArguments([], "/tmp/fta.json")).toEqual([
      "--json",
      "--config-path",
      "/tmp/fta.json",
      ".",
    ]);
  });

  it("drops a user-supplied --json so it is not forwarded to fta twice", () => {
    expect(buildFtaArguments(["--json", "src"], "/tmp/fta.json")).toEqual([
      "--json",
      "--config-path",
      "/tmp/fta.json",
      "src",
    ]);
  });

  it("omits the injected config path when configPath is null", () => {
    expect(buildFtaArguments(["--config-path", "./fta.json", "src"], null)).toEqual([
      "--json",
      "--config-path",
      "./fta.json",
      "src",
    ]);
  });
});
