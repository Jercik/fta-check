import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect, onTestFinished, vi } from "vitest";
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

    expect(getViolations(1, [projectDirectory], ftaBinary)).toMatchObject([
      { file_name: "classify.ts" },
    ]);
  });
});

function createProjectDirectory(): string {
  const root = mkdtempSync(path.join(tmpdir(), "fta-check-test-"));
  onTestFinished(() => {
    rmSync(root, { recursive: true, force: true });
  });
  const projectDirectory = path.join(root, "project");
  mkdirSync(projectDirectory);
  writeFileSync(path.join(projectDirectory, "classify.ts"), branchySource);
  return projectDirectory;
}

/** Points os.tmpdir() at an empty directory, so anything a run leaves behind is visible there. */
function redirectTemporaryDirectory(): string {
  const scratchDirectory = mkdtempSync(path.join(tmpdir(), "fta-check-test-"));
  vi.stubEnv("TMPDIR", scratchDirectory);
  onTestFinished(() => {
    vi.unstubAllEnvs();
    rmSync(scratchDirectory, { recursive: true, force: true });
  });
  return scratchDirectory;
}

function createFakeFtaBinary(script: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), "fta-check-test-"));
  onTestFinished(() => {
    rmSync(directory, { recursive: true, force: true });
  });
  const binaryPath = path.join(directory, "fake-fta");
  writeFileSync(binaryPath, script, { mode: 0o755 });
  return binaryPath;
}

describe("getViolations temporary config directory", () => {
  it("is removed after a successful run", () => {
    const projectDirectory = createProjectDirectory();
    const scratchDirectory = redirectTemporaryDirectory();

    expect(getViolations(1, [projectDirectory], resolveFtaBinary())).toMatchObject([
      { file_name: "classify.ts" },
    ]);
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
  });

  it("is removed when the fta binary is missing", () => {
    const projectDirectory = createProjectDirectory();
    const scratchDirectory = redirectTemporaryDirectory();

    expect(() =>
      getViolations(1, [projectDirectory], path.join(scratchDirectory, "missing-fta")),
    ).toThrow("FTA binary not found");
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
  });

  it.each([
    ["exits non-zero", "#!/bin/sh\necho boom >&2\nexit 3\n", "FTA CLI failed with exit code 3"],
    ["prints unparseable JSON", "#!/bin/sh\necho not-json\n", "Failed to execute FTA CLI"],
  ])("is removed when fta %s", (_case, script, message) => {
    const projectDirectory = createProjectDirectory();
    const ftaBinary = createFakeFtaBinary(script);
    const scratchDirectory = redirectTemporaryDirectory();

    expect(() => getViolations(1, [projectDirectory], ftaBinary)).toThrow(message);
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
  });

  it("is not created, and the user's config is kept, when --config-path is given", () => {
    const projectDirectory = createProjectDirectory();
    const userConfigPath = path.join(projectDirectory, "custom-fta.json");
    writeFileSync(userConfigPath, "{}");
    const scratchDirectory = redirectTemporaryDirectory();

    expect(
      getViolations(1, ["--config-path", userConfigPath, projectDirectory], resolveFtaBinary()),
    ).toMatchObject([{ file_name: "classify.ts" }]);
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
    expect(existsSync(userConfigPath)).toBe(true);
  });
});
