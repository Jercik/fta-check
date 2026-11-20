import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { InvalidArgumentError } from "@commander-js/extra-typings";
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

  it.each(["", "  ", "abc", "0", "-5"])(
    "rejects %j with the error commander reports as a usage error",
    (value) => {
      expect(() => parseThresholdValue(value)).toThrow(
        new InvalidArgumentError("Expected a positive number."),
      );
    },
  );
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

  it.each([
    [
      ["--exclude-under", "10"],
      ["--json", "--config-path", "/tmp/fta.json", "--exclude-under", "10", "."],
    ],
    [
      ["-s", "500"],
      ["--json", "--config-path", "/tmp/fta.json", "-s", "500", "."],
    ],
    [
      ["-e", "10"],
      ["--json", "--config-path", "/tmp/fta.json", "-e", "10", "."],
    ],
  ])("does not mistake an option value in %j for the project path", (ftaArguments, expected) => {
    expect(buildFtaArguments(ftaArguments, "/tmp/fta.json")).toStrictEqual(expected);
  });

  it("keeps a project path given after an option value", () => {
    expect(buildFtaArguments(["-e", "10", "src"], "/tmp/fta.json")).toStrictEqual([
      "--json",
      "--config-path",
      "/tmp/fta.json",
      "-e",
      "10",
      "src",
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

const recordArgumentsScript = `#!/bin/sh
printf '%s\\n' "$@" > "$(dirname "$0")/arguments.txt"
echo '[]'
`;

function readRecordedArguments(ftaBinary: string): string[] {
  return readFileSync(path.join(path.dirname(ftaBinary), "arguments.txt"), "utf8")
    .trimEnd()
    .split("\n");
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

  it("is removed when fta exits non-zero", () => {
    const projectDirectory = createProjectDirectory();
    const ftaBinary = createFakeFtaBinary("#!/bin/sh\necho boom >&2\nexit 3\n");
    const scratchDirectory = redirectTemporaryDirectory();

    expect(() => getViolations(1, [projectDirectory], ftaBinary)).toThrow(
      "FTA CLI failed with exit code 3",
    );
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
  });

  it("is not created, and the user's config is kept, when --config-path is given", () => {
    const projectDirectory = createProjectDirectory();
    const userConfigPath = path.join(projectDirectory, "custom-fta.json");
    writeFileSync(userConfigPath, "{}");
    const ftaBinary = createFakeFtaBinary(recordArgumentsScript);
    const scratchDirectory = redirectTemporaryDirectory();

    expect(
      getViolations(1, ["--config-path", userConfigPath, projectDirectory], ftaBinary),
    ).toStrictEqual([]);
    expect(readRecordedArguments(ftaBinary)).toStrictEqual([
      "--json",
      "--config-path",
      userConfigPath,
      projectDirectory,
    ]);
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
    expect(existsSync(userConfigPath)).toBe(true);
  });
});

describe("getViolations output size", () => {
  it("parses fta output larger than 1 MiB", () => {
    const projectDirectory = createProjectDirectory();
    const ftaBinary = createFakeFtaBinary(`#!/usr/bin/env node
const entry = (fileName, ftaScore) => ({ file_name: fileName, fta_score: ftaScore, padding: "x".repeat(400) });
const results = Array.from({ length: 3000 }, (_, index) => entry("simple-" + index + ".ts", 10));
results.push(entry("complex.ts", 75));
process.stdout.write(JSON.stringify(results));
`);
    redirectTemporaryDirectory();

    expect(getViolations(60, [projectDirectory], ftaBinary)).toMatchObject([
      { file_name: "complex.ts", fta_score: 75 },
    ]);
  });
});

describe("getViolations output errors", () => {
  it("reports output that is not JSON", () => {
    const projectDirectory = createProjectDirectory();
    const ftaBinary = createFakeFtaBinary("#!/bin/sh\necho not-json\n");
    redirectTemporaryDirectory();

    expect(() => getViolations(1, [projectDirectory], ftaBinary)).toThrow(
      "Failed to execute FTA CLI",
    );
  });
});
