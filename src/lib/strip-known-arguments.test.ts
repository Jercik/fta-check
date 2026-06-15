import { describe, expect, it } from "vitest";
import { stripKnownArguments } from "./strip-known-arguments.js";

const known = [
  { name: "--threshold", takesValue: true },
  { name: "--verbose", takesValue: false },
] as const;

describe("stripKnownArguments", () => {
  it("returns an empty array for empty input", () => {
    expect(stripKnownArguments([], known)).toEqual([]);
  });

  it("removes an exact boolean flag and preserves the rest", () => {
    expect(stripKnownArguments(["--verbose", "src"], known)).toEqual(["src"]);
  });

  it("removes a value-consuming flag and its separate value", () => {
    expect(stripKnownArguments(["--threshold", "50", "src"], known)).toEqual(["src"]);
  });

  it("removes a value-consuming flag in assignment form", () => {
    expect(stripKnownArguments(["--threshold=50", "src"], known)).toEqual(["src"]);
  });

  it("preserves unknown arguments and their order", () => {
    expect(stripKnownArguments(["--config-path", "./fta.json", "src"], known)).toEqual([
      "--config-path",
      "./fta.json",
      "src",
    ]);
  });

  it("removes a trailing value-consuming flag that has no value", () => {
    expect(stripKnownArguments(["src", "--threshold"], known)).toEqual(["src"]);
  });

  it("keeps the following flag when a value-consuming flag has no value", () => {
    expect(stripKnownArguments(["--threshold", "--config-path", "./fta.json"], known)).toEqual([
      "--config-path",
      "./fta.json",
    ]);
  });

  it("does not consume a value that starts with a dash", () => {
    expect(stripKnownArguments(["--threshold", "-50", "src"], known)).toEqual(["-50", "src"]);
  });

  it("consumes an empty string as the value", () => {
    expect(stripKnownArguments(["--threshold", "", "src"], known)).toEqual(["src"]);
  });

  it("preserves near-miss names that are not exact matches", () => {
    expect(stripKnownArguments(["--threshold-other", "50", "--verbosely", "src"], known)).toEqual([
      "--threshold-other",
      "50",
      "--verbosely",
      "src",
    ]);
  });

  it("removes multiple occurrences across both flag forms", () => {
    expect(stripKnownArguments(["--threshold", "50", "--threshold=75", "src"], known)).toEqual([
      "src",
    ]);
  });
});
