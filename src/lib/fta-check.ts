import { execFileSync } from "node:child_process";
import type { FtaResult } from "../fta-types.js";
import { loadConfig, writeConfigToTemporaryFile } from "./fta-config.js";

export const DEFAULT_THRESHOLD = 55;
const missingValueMessage = "--threshold requires a non-empty value (e.g., --threshold=55)";

export function parseThresholdValue(value: string): number {
  if (value.trim() === "") {
    throw new TypeError(missingValueMessage);
  }

  const threshold = Number(value);
  if (Number.isNaN(threshold) || threshold <= 0) {
    throw new TypeError("--threshold must be a positive number");
  }
  return threshold;
}

type ExecSyncError = Error & {
  status?: number;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
};

function hasPositionalPath(arguments_: string[]): boolean {
  for (const a of arguments_) {
    if (!a.startsWith("-")) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if user provided --config-path or -c flag.
 */
function hasUserConfigPath(arguments_: string[]): boolean {
  return arguments_.some(
    (a) =>
      a === "--config-path" || a === "-c" || a.startsWith("--config-path=") || a.startsWith("-c="),
  );
}

export function buildFtaArguments(ftaArguments: string[], configPath: string | null): string[] {
  // fta-check always injects its own --json; drop a user-supplied one so fta isn't given it twice.
  const userArguments = ftaArguments.filter((a) => a !== "--json");
  const finalArguments =
    configPath === null
      ? ["--json", ...userArguments]
      : ["--json", "--config-path", configPath, ...userArguments];
  if (!hasPositionalPath(userArguments)) {
    finalArguments.push(".");
  }
  return finalArguments;
}

export function getViolations(threshold: number, ftaArguments: string[] = []): FtaResult[] {
  try {
    const configPath = hasUserConfigPath(ftaArguments)
      ? null
      : writeConfigToTemporaryFile(loadConfig(process.cwd()));
    const finalArguments = buildFtaArguments(ftaArguments, configPath);

    const output = execFileSync("fta", finalArguments, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return (JSON.parse(output) as FtaResult[]).filter((r) => r.fta_score > threshold);
  } catch (error_) {
    const error = error_ as ExecSyncError;
    if ((error as unknown as { code?: string }).code === "ENOENT") {
      throw new Error(
        "FTA CLI not found on PATH. Please install 'fta-cli' (peer dependency) in your project and re-run: npm i -D fta-cli",
        { cause: error_ },
      );
    }
    if (typeof error.status === "number" && error.stderr) {
      const stderrText = Buffer.isBuffer(error.stderr) ? error.stderr.toString() : error.stderr;
      throw new Error(`FTA CLI failed with exit code ${String(error.status)}: ${stderrText}`, {
        cause: error_,
      });
    }
    throw new Error(`Failed to execute FTA CLI: ${String(error_)}`, {
      cause: error_,
    });
  }
}
