import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect, onTestFinished } from "vitest";
import { buildFtaArguments, getViolations, parseThresholdValue } from "./fta-check.js";
import { resolveFtaBinary } from "./resolve-fta-binary.js";

const branchySource = `export function classify(value: number): string {
  if (value > 10) {
    return "large";
  }
  if (value > 5) {
    return "medium";
  }
  return "small";
}
`;

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
    expect(buildFtaArguments([], "/tmp/fta.json")).toStrictEqual([
      "--json",
      "--config-path",
      "/tmp/fta.json",
      ".",
    ]);
  });

  it("drops a user-supplied --json so it is not forwarded to fta twice", () => {
    expect(buildFtaArguments(["--json", "src"], "/tmp/fta.json")).toStrictEqual([
      "--json",
      "--config-path",
      "/tmp/fta.json",
      "src",
    ]);
  });

  it("omits the injected config path when configPath is null", () => {
    expect(buildFtaArguments(["--config-path", "./fta.json", "src"], null)).toStrictEqual([
      "--json",
      "--config-path",
      "./fta.json",
      "src",
    ]);
  });
});

describe("getViolations", () => {
  it("runs fta when the binary path and the project path contain spaces", () => {
    const root = mkdtempSync(path.join(tmpdir(), "fta-check-test-"));
    onTestFinished(() => {
      rmSync(root, { recursive: true, force: true });
    });
    const binaryDirectory = path.join(root, "Application Support");
    const projectDirectory = path.join(root, "project dir");
    mkdirSync(binaryDirectory);
    mkdirSync(projectDirectory);
    const ftaBinary = path.join(binaryDirectory, path.basename(resolveFtaBinary()));
    copyFileSync(resolveFtaBinary(), ftaBinary);
    writeFileSync(path.join(projectDirectory, "classify.ts"), branchySource);

    expect(getViolations(ftaBinary, 1, [projectDirectory])).toMatchObject([
      { file_name: "classify.ts" },
    ]);
  });
});
