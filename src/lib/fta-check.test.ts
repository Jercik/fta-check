import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { InvalidArgumentError } from "@commander-js/extra-typings";
import { describe, it, expect, onTestFinished, vi } from "vitest";
import { getViolations, parseThresholdValue } from "./fta-check.js";
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

    expect(
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        ftaBinary,
      ),
    ).toMatchObject([{ file_name: path.join(projectDirectory, "classify.ts") }]);
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

describe("getViolations fta.json", () => {
  it("reads the analyzed directory's fta.json over one in the working directory above it", () => {
    const projectDirectory = createProjectDirectory();
    const parentDirectory = path.dirname(projectDirectory);
    writeFileSync(path.join(projectDirectory, "generated.ts"), branchySource);
    writeFileSync(
      path.join(projectDirectory, "fta.json"),
      JSON.stringify({ exclude_filenames: ["generated.ts"] }),
    );
    writeFileSync(
      path.join(parentDirectory, "fta.json"),
      JSON.stringify({ exclude_filenames: ["classify.ts"] }),
    );
    vi.spyOn(process, "cwd").mockReturnValue(parentDirectory);
    onTestFinished(() => {
      vi.restoreAllMocks();
    });

    expect(
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        resolveFtaBinary(),
      ),
    ).toMatchObject([{ file_name: path.join(projectDirectory, "classify.ts") }]);
  });

  it("reads fta.json from a directory above the analyzed one when it has none", () => {
    const projectDirectory = createProjectDirectory();
    writeFileSync(path.join(projectDirectory, "generated.ts"), branchySource);
    writeFileSync(
      path.join(path.dirname(projectDirectory), "fta.json"),
      JSON.stringify({ exclude_filenames: ["generated.ts"] }),
    );

    expect(
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        resolveFtaBinary(),
      ),
    ).toMatchObject([{ file_name: path.join(projectDirectory, "classify.ts") }]);
  });

  it("reads a given config file instead of the analyzed directory's fta.json", () => {
    const projectDirectory = createProjectDirectory();
    writeFileSync(path.join(projectDirectory, "generated.ts"), branchySource);
    writeFileSync(
      path.join(projectDirectory, "fta.json"),
      JSON.stringify({ exclude_filenames: ["classify.ts"] }),
    );
    const configFile = path.join(path.dirname(projectDirectory), "custom-fta.json");
    writeFileSync(configFile, JSON.stringify({ exclude_filenames: ["generated.ts"] }));

    expect(
      getViolations({ threshold: 1, directory: projectDirectory, configFile }, resolveFtaBinary()),
    ).toMatchObject([{ file_name: path.join(projectDirectory, "classify.ts") }]);
  });

  it("keeps the default test-file exclusion with a given config file", () => {
    const projectDirectory = createProjectDirectory();
    writeFileSync(path.join(projectDirectory, "classify.test.ts"), branchySource);
    const configFile = path.join(path.dirname(projectDirectory), "custom-fta.json");
    writeFileSync(configFile, JSON.stringify({ score_cap: 1000 }));

    expect(
      getViolations({ threshold: 1, directory: projectDirectory, configFile }, resolveFtaBinary()),
    ).toMatchObject([{ file_name: path.join(projectDirectory, "classify.ts") }]);
  });
});

describe("getViolations temporary config directory", () => {
  it("is removed after a successful run", () => {
    const projectDirectory = createProjectDirectory();
    const scratchDirectory = redirectTemporaryDirectory();

    expect(
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        resolveFtaBinary(),
      ),
    ).toMatchObject([{ file_name: path.join(projectDirectory, "classify.ts") }]);
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
  });

  it("is removed when the fta binary is missing", () => {
    const projectDirectory = createProjectDirectory();
    const scratchDirectory = redirectTemporaryDirectory();

    expect(() =>
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        path.join(scratchDirectory, "missing-fta"),
      ),
    ).toThrow("FTA binary not found");
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
  });

  it("is removed when fta exits non-zero", () => {
    const projectDirectory = createProjectDirectory();
    const ftaBinary = createFakeFtaBinary("#!/bin/sh\necho boom >&2\nexit 3\n");
    const scratchDirectory = redirectTemporaryDirectory();

    expect(() =>
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        ftaBinary,
      ),
    ).toThrow("FTA CLI failed with exit code 3");
    expect(readdirSync(scratchDirectory)).toStrictEqual([]);
  });
});

describe("getViolations fta exit failures", () => {
  it.each([
    [
      "stderr",
      "#!/bin/sh\necho 'cannot read src' >&2\nexit 3\n",
      "FTA CLI failed with exit code 3: cannot read src",
    ],
    [
      "stdout when stderr is empty",
      "#!/bin/sh\necho 'cannot read src'\nexit 3\n",
      "FTA CLI failed with exit code 3: cannot read src",
    ],
    ["no output", "#!/bin/sh\nexit 3\n", "FTA CLI failed with exit code 3"],
  ])("reports the exit code with %s", (_output, script, expected) => {
    const projectDirectory = createProjectDirectory();
    const ftaBinary = createFakeFtaBinary(script);
    redirectTemporaryDirectory();

    expect(() =>
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        ftaBinary,
      ),
    ).toThrow(new Error(expected));
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

    expect(
      getViolations(
        { threshold: 60, directory: projectDirectory, configFile: undefined },
        ftaBinary,
      ),
    ).toMatchObject([{ file_name: path.join(projectDirectory, "complex.ts"), fta_score: 75 }]);
  });
});

describe("getViolations output errors", () => {
  it("reports output that is not JSON", () => {
    const projectDirectory = createProjectDirectory();
    const ftaBinary = createFakeFtaBinary("#!/bin/sh\necho not-json\n");
    redirectTemporaryDirectory();

    expect(() =>
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        ftaBinary,
      ),
    ).toThrow(/^FTA CLI printed output that is not JSON: SyntaxError: /u);
  });
});

describe("getViolations errors before fta runs", () => {
  it("reports an invalid fta.json as such, not as an FTA CLI failure", () => {
    const projectDirectory = createProjectDirectory();
    writeFileSync(path.join(projectDirectory, "fta.json"), "{bad");

    expect(() =>
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        resolveFtaBinary(),
      ),
    ).toThrow(/^Invalid JSON in .*fta\.json: /u);
  });

  it("reports a missing temporary directory as such, not as a missing fta binary", () => {
    const projectDirectory = createProjectDirectory();
    vi.stubEnv("TMPDIR", "/nonexistent-fta-check-tmpdir");
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });

    expect(() =>
      getViolations(
        { threshold: 1, directory: projectDirectory, configFile: undefined },
        resolveFtaBinary(),
      ),
    ).toThrow(
      /^ENOENT: no such file or directory, mkdtemp '\/nonexistent-fta-check-tmpdir\/fta-check-/u,
    );
  });
});

describe("getViolations file names", () => {
  it.each([
    ["./src", "src/lib/complex.ts"],
    ["packages/app", "packages/app/lib/complex.ts"],
    [".", "lib/complex.ts"],
  ])("names files from the working directory when analyzing %j", (directory, expected) => {
    const ftaBinary = createFakeFtaBinary(`#!/bin/sh
echo '[{"file_name": "lib/complex.ts", "fta_score": 75}]'
`);
    redirectTemporaryDirectory();

    expect(
      getViolations({ threshold: 60, directory, configFile: undefined }, ftaBinary),
    ).toMatchObject([{ file_name: expected, fta_score: 75 }]);
  });
});
