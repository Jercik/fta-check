import { execFileSync } from "node:child_process";
import type { FtaResult } from "../fta-types.js";

export const DEFAULT_THRESHOLD = 50;
const missingValueMessage =
  "--threshold requires a non-empty value (e.g., --threshold=50)";

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

export function getViolations(threshold: number): FtaResult[] {
  try {
    const output = execFileSync("fta", ["--json", "."], {
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
      );
    }
    if (typeof error.status === "number" && error.stderr) {
      const stderrText = Buffer.isBuffer(error.stderr)
        ? error.stderr.toString()
        : error.stderr;
      throw new Error(
        `FTA CLI failed with exit code ${String(error.status)}: ${stderrText}`,
      );
    }
    throw new Error(`Failed to execute FTA CLI: ${String(error_)}`);
  }
}
