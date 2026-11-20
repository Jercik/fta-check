import { execFileSync } from "node:child_process";
import path from "node:path";
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

export interface CheckOptions {
  threshold: number;
  directory: string;
  configFile: string | undefined;
}

export function getViolations(
  { threshold, directory, configFile }: CheckOptions,
  ftaBinary: string = resolveFtaBinary(),
): FtaResult[] {
  const output = withTemporaryConfigFile(loadConfig(directory, configFile), (configPath) =>
    executeFta(ftaBinary, ["--json", "--config-path", configPath, directory]),
  );
  // fta names each file relative to the analyzed directory.
  return parseFtaOutput(output)
    .filter((r) => r.fta_score > threshold)
    .map((r) => ({ ...r, file_name: path.join(directory, r.file_name) }));
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
