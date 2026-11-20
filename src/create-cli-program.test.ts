import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CommanderError } from "@commander-js/extra-typings";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { createCliProgram } from "./create-cli-program.js";

function usageErrorFor(arguments_: string[]): string {
  let errorOutput = "";
  const program = createCliProgram()
    .exitOverride()
    .configureOutput({
      writeErr: (text) => {
        errorOutput += text;
      },
    });
  expect(() => program.parse(arguments_, { from: "user" })).toThrow(CommanderError);
  return errorOutput;
}

describe("createCliProgram", () => {
  it("names the installed command in the usage line", () => {
    expect(createCliProgram().helpInformation()).toMatch(
      /^Usage: fta-check \[options\] \[directory\]\n/u,
    );
  });

  it("rejects a misspelled option with a suggestion", () => {
    expect(usageErrorFor(["--treshold", "50"])).toBe(
      "error: unknown option '--treshold'\n(Did you mean --threshold?)\n(add --help for additional information)\n",
    );
  });

  it("rejects a second directory", () => {
    expect(usageErrorFor(["src", "lib"])).toBe(
      "error: too many arguments. Expected 1 argument but got 2: src, lib.\n(add --help for additional information)\n",
    );
  });
});

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

function createProjectDirectory(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "fta-check-test-"));
  onTestFinished(() => {
    rmSync(root, { recursive: true, force: true });
  });
  const directory = path.join(root, "project");
  mkdirSync(directory);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(directory, name), content);
  }
  return directory;
}

function checkExitStatusFor(arguments_: string[]): typeof process.exitCode {
  vi.spyOn(console, "error").mockImplementation(() => {});
  onTestFinished(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });
  createCliProgram().parse(arguments_, { from: "user" });
  return process.exitCode;
}

function commanderExitStatusFor(arguments_: string[]): number | undefined {
  let status: number | undefined;
  vi.spyOn(process, "exit").mockImplementation((code) => {
    status = Number(code);
    throw new Error("process.exit");
  });
  onTestFinished(() => {
    vi.restoreAllMocks();
  });
  const program = createCliProgram().configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });
  expect(() => program.parse(arguments_, { from: "user" })).toThrow("process.exit");
  return status;
}

describe("createCliProgram exit status", () => {
  it("is 0 when every file is within the threshold", () => {
    const directory = createProjectDirectory({ "classify.ts": branchySource });

    expect(checkExitStatusFor(["--threshold", "1000", directory])).toBe(0);
  });

  it("is 1 when a file scores above the threshold", () => {
    const directory = createProjectDirectory({ "classify.ts": branchySource });

    expect(checkExitStatusFor(["--threshold", "1", directory])).toBe(1);
  });

  it("is 2 when the check cannot run", () => {
    const directory = createProjectDirectory({
      "classify.ts": branchySource,
      "fta.json": "{bad",
    });

    expect(checkExitStatusFor([directory])).toBe(2);
  });

  it.each([
    [["--treshold", "50"], 2],
    [["--threshold", "-1"], 2],
    [["src", "lib"], 2],
    [["--help"], 0],
    [["--version"], 0],
  ])("for arguments %j is %j", (arguments_, expected) => {
    expect(commanderExitStatusFor(arguments_)).toBe(expected);
  });
});
