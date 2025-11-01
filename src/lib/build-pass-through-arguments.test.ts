import { describe, expect, it } from "vitest";
import { buildPassThroughArguments } from "./build-pass-through-arguments.js";

describe("buildPassThroughArguments", () => {
  it("returns empty array when given empty array", () => {
    expect(buildPassThroughArguments([])).toEqual([]);
  });

  it("strips --threshold flag with separate value", () => {
    const input = ["--threshold", "50", "src"];
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("strips --threshold flag with equals sign", () => {
    const input = ["--threshold=50", "src"];
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("strips multiple --threshold occurrences", () => {
    const input = ["--threshold", "50", "--threshold=75", "src"];
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("preserves other flags and arguments", () => {
    const input = [
      "--config-path",
      "./config/fta.json",
      "--output-limit",
      "100",
      "src",
    ];
    expect(buildPassThroughArguments(input)).toEqual([
      "--config-path",
      "./config/fta.json",
      "--output-limit",
      "100",
      "src",
    ]);
  });

  it("strips short help flag -h", () => {
    const input = ["-h", "src"];
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("strips long help flag --help", () => {
    const input = ["--help", "src"];
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("strips short version flag -V", () => {
    const input = ["-V", "src"];
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("strips long version flag --version", () => {
    const input = ["--version", "src"];
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("handles --threshold without value at end of array", () => {
    const input = ["src", "--threshold"];
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("handles --threshold followed by another flag", () => {
    const input = ["--threshold", "--config-path", "./config/fta.json"];
    expect(buildPassThroughArguments(input)).toEqual([
      "--config-path",
      "./config/fta.json",
    ]);
  });

  it("handles --threshold with negative number value", () => {
    const input = ["--threshold", "-50", "src"];
    // -50 starts with "-" so it's treated as a flag, not a value
    expect(buildPassThroughArguments(input)).toEqual(["-50", "src"]);
  });

  it("preserves flags that contain 'threshold' but are not --threshold", () => {
    const input = ["--threshold-other", "50", "--my-threshold", "src"];
    expect(buildPassThroughArguments(input)).toEqual([
      "--threshold-other",
      "50",
      "--my-threshold",
      "src",
    ]);
  });

  it("preserves flags that contain help/version but are not exact matches", () => {
    const input = ["--helper", "--versions", "-hv", "src"];
    expect(buildPassThroughArguments(input)).toEqual([
      "--helper",
      "--versions",
      "-hv",
      "src",
    ]);
  });

  it("handles complex real-world scenario", () => {
    const input = [
      "--threshold",
      "60",
      "--config-path",
      "./config/fta.json",
      "--output-limit",
      "1000",
      "-h",
      "--threshold=75",
      "./src",
      "--exclude-directories",
      "node_modules",
      "--version",
    ];
    expect(buildPassThroughArguments(input)).toEqual([
      "--config-path",
      "./config/fta.json",
      "--output-limit",
      "1000",
      "./src",
      "--exclude-directories",
      "node_modules",
    ]);
  });

  it("handles empty string as threshold value", () => {
    const input = ["--threshold", "", "src"];
    // Empty string doesn't start with "-" so it's consumed as value
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("handles paths that look like flags", () => {
    const input = ["--threshold", "./--test-file.ts", "src"];
    // Path doesn't start with "-" alone, so it's consumed as value
    expect(buildPassThroughArguments(input)).toEqual(["src"]);
  });

  it("preserves order of remaining arguments", () => {
    const input = ["a", "--threshold", "50", "b", "-h", "c", "--version", "d"];
    expect(buildPassThroughArguments(input)).toEqual(["a", "b", "c", "d"]);
  });
});
