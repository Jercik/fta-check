import { execFileSync } from "node:child_process";
import type { FtaResult } from "../fta-types.js";
import { loadConfig, writeConfigToTemporaryFile } from "./fta-config.js";

export const DEFAULT_THRESHOLD = 55;
const missingValueMessage =
  "--threshold requires a non-empty value (e.g., --threshold=55)";

export function parseThresholdValue(value: string): number {
  if (value.trim() === "") throw new TypeError(missingValueMessage);

  const threshold = Number(value);
  if (Number.isNaN(threshold) || threshold <= 0) {
    throw new TypeError("--threshold must be a positive number");
  }
  return threshold;
}

export function parseThreshold(arguments_: string[]): number {
  const index = arguments_.findIndex(
    (argument) =>
      argument === "--threshold" || argument.startsWith("--threshold="),
  );
  if (index === -1) return DEFAULT_THRESHOLD;

  const argument = arguments_[index];
  if (argument === undefined) {
    throw new TypeError(missingValueMessage);
  }

  if (argument === "--threshold") {
    const nextValue = arguments_[index + 1];
    if (nextValue === undefined || nextValue.startsWith("--")) {
      throw new TypeError(missingValueMessage);
    }
    return parseThresholdValue(nextValue);
  }

  const [, value = ""] = argument.split("=", 2);
  return parseThresholdValue(value);
}

type ExecSyncError = Error & {
  status?: number;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
};

function hasPositionalPath(arguments_: string[]): boolean {
  for (const a of arguments_) {
    if (!a.startsWith("-")) return true;
  }
  return false;
}

function stripArgument(arguments_: string[], name: string): string[] {
  const out: string[] = [];
  for (let index = 0; index < arguments_.length; index++) {
    const a = arguments_[index] as string;
    if (a === name) {
      // skip this and its value (if any)
      const next = arguments_[index + 1] as string | undefined;
      if (next && !next.startsWith("-")) index++;
      continue;
    }
    if (a.startsWith(`${name}=`)) continue;
    out.push(a);
  }
  return out;
}

/**
 * Checks if user provided --config-path or -c flag.
 */
function hasUserConfigPath(arguments_: string[]): boolean {
  return arguments_.some(
    (a) =>
      a === "--config-path" ||
      a === "-c" ||
      a.startsWith("--config-path=") ||
      a.startsWith("-c="),
  );
}

export function getViolations(
  threshold: number,
  ftaArguments: string[] = [],
): FtaResult[] {
  try {
    // Strip --json (we always add it for parsing)
    const argumentsWithoutJson = stripArgument(ftaArguments, "--json");

    // Check for positional path before building final arguments
    const needsDefaultPath = !hasPositionalPath(argumentsWithoutJson);

    let finalArguments: string[];

    if (hasUserConfigPath(argumentsWithoutJson)) {
      // User provided custom config - skip our defaults, pass through as-is
      finalArguments = ["--json", ...argumentsWithoutJson];
    } else {
      // No user config - apply our defaults from project root (cwd)
      const config = loadConfig(process.cwd());
      const configPath = writeConfigToTemporaryFile(config);
      finalArguments = [
        "--json",
        "--config-path",
        configPath,
        ...argumentsWithoutJson,
      ];
    }

    if (needsDefaultPath) finalArguments.push(".");

    const output = execFileSync("fta", finalArguments, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return (JSON.parse(output) as FtaResult[]).filter(
      (r) => r.fta_score > threshold,
    );
  } catch (error_) {
    const error = error_ as ExecSyncError;
    if ((error as unknown as { code?: string }).code === "ENOENT") {
      throw new Error(
        "FTA CLI not found on PATH. Please install 'fta-cli' (peer dependency) in your project and re-run: npm i -D fta-cli",
        { cause: error_ },
      );
    }
    if (typeof error.status === "number" && error.stderr) {
      const stderrText = Buffer.isBuffer(error.stderr)
        ? error.stderr.toString()
        : error.stderr;
      throw new Error(
        `FTA CLI failed with exit code ${String(error.status)}: ${stderrText}`,
        { cause: error_ },
      );
    }
    throw new Error(`Failed to execute FTA CLI: ${String(error_)}`, {
      cause: error_,
    });
  }
}
