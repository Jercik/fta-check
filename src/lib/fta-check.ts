import { execFileSync } from "node:child_process";
import { InvalidArgumentError } from "@commander-js/extra-typings";
import type { FtaResult } from "../fta-types.js";
import { loadConfig, withTemporaryConfigFile } from "./fta-config.js";
import { resolveFtaBinary } from "./resolve-fta-binary.js";

// FTA labels a score above 60 "Needs improvement".
export const DEFAULT_THRESHOLD = 60;

export function parseThresholdValue(value: string): number {
  const threshold = Number(value);
  if (Number.isNaN(threshold) || threshold <= 0) {
    throw new InvalidArgumentError("Expected a positive number.");
  }
  return threshold;
}

type ExecSyncError = Error & {
  status?: number;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
};

// fta-cli 3 reads the argument after each of these options as its value, never as the project path.
const FTA_OPTIONS_WITH_VALUE = new Set([
  "-c",
  "--config-path",
  "-f",
  "--format",
  "-o",
  "--output-limit",
  "-s",
  "--score-cap",
  "-i",
  "--include-comments",
  "-e",
  "--exclude-under",
]);

interface FtaArgumentFacts {
  givesConfigPath: boolean;
  givesProjectPath: boolean;
}

function readFtaArguments(arguments_: string[]): FtaArgumentFacts {
  const facts = { givesConfigPath: false, givesProjectPath: false };
  const remaining = arguments_.values();
  for (const argument of remaining) {
    if (FTA_OPTIONS_WITH_VALUE.has(argument)) {
      if (argument === "-c" || argument === "--config-path") {
        facts.givesConfigPath = true;
      }
      remaining.next();
    } else if (argument.startsWith("-c=") || argument.startsWith("--config-path=")) {
      facts.givesConfigPath = true;
    } else if (!argument.startsWith("-")) {
      facts.givesProjectPath = true;
    }
  }
  return facts;
}

export function buildFtaArguments(ftaArguments: string[], configPath: string | null): string[] {
  // fta-check always injects its own --json; drop a user-supplied one so fta isn't given it twice.
  const userArguments = ftaArguments.filter((a) => a !== "--json");
  const finalArguments =
    configPath === null
      ? ["--json", ...userArguments]
      : ["--json", "--config-path", configPath, ...userArguments];
  if (!readFtaArguments(userArguments).givesProjectPath) {
    finalArguments.push(".");
  }
  return finalArguments;
}

export function getViolations(
  threshold: number,
  ftaArguments: string[],
  ftaBinary: string = resolveFtaBinary(),
): FtaResult[] {
  const runFta = (configPath: string | null): string =>
    executeFta(ftaBinary, buildFtaArguments(ftaArguments, configPath));

  const output = readFtaArguments(ftaArguments).givesConfigPath
    ? runFta(null)
    : withTemporaryConfigFile(loadConfig(process.cwd()), runFta);
  return parseFtaOutput(output).filter((r) => r.fta_score > threshold);
}

function parseFtaOutput(output: string): FtaResult[] {
  try {
    return JSON.parse(output) as FtaResult[];
  } catch (error) {
    throw new Error(`FTA CLI printed output that is not JSON: ${String(error)}`, {
      cause: error,
    });
  }
}

function executeFta(ftaBinary: string, finalArguments: string[]): string {
  try {
    return execFileSync(ftaBinary, finalArguments, {
      encoding: "utf8",
      // fta --json reports every analyzed file, so its output grows with the project past any fixed cap.
      maxBuffer: Number.POSITIVE_INFINITY,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error_) {
    const error = error_ as ExecSyncError;
    if ((error as unknown as { code?: string }).code === "ENOENT") {
      throw new Error(`FTA binary not found at ${ftaBinary}`, { cause: error_ });
    }
    if (typeof error.status === "number") {
      const stderrText = String(error.stderr ?? "").trim();
      const report = stderrText === "" ? String(error.stdout ?? "").trim() : stderrText;
      const detail = report === "" ? "" : `: ${report}`;
      throw new Error(`FTA CLI failed with exit code ${String(error.status)}${detail}`, {
        cause: error_,
      });
    }
    throw new Error(`Failed to execute FTA CLI: ${String(error_)}`, {
      cause: error_,
    });
  }
}
