import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * FTA configuration schema matching fta.json format.
 * All keys are optional - missing keys use FTA's built-in defaults.
 */
export type FtaConfig = {
  output_limit?: number;
  score_cap?: number;
  include_comments?: boolean;
  exclude_under?: number;
  exclude_directories?: string[];
  exclude_filenames?: string[];
  extensions?: string[];
};

/**
 * Default config applied by fta-check.
 * These defaults can be overridden per-key by a repo's fta.json.
 */
export const DEFAULT_CONFIG: FtaConfig = {
  exclude_filenames: ["*.test.{ts,tsx}"],
};

/**
 * Reads fta.json from the specified directory if it exists.
 * Returns undefined if the file doesn't exist.
 */
export function readConfigFile(directory: string): FtaConfig | undefined {
  const configPath = path.join(directory, "fta.json");
  if (!existsSync(configPath)) return undefined;

  const content = readFileSync(configPath, "utf8");
  return JSON.parse(content) as FtaConfig;
}

/**
 * Merges default config with repo config using "replace per key" strategy.
 * If a key exists in repoConfig, it completely replaces the default.
 * Keys not in repoConfig use the default value.
 */
export function mergeConfig(
  defaultConfig: FtaConfig,
  repoConfig?: FtaConfig,
): FtaConfig {
  if (repoConfig === undefined) return { ...defaultConfig };

  // Spread operator handles "replace per key" - repo config overwrites defaults
  return { ...defaultConfig, ...repoConfig };
}

/**
 * Writes config to a temporary file and returns the path.
 * The temp directory is created fresh each call.
 */
export function writeConfigToTemporaryFile(config: FtaConfig): string {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "fta-check-"));
  const configPath = path.join(temporaryDirectory, "fta.json");
  writeFileSync(configPath, JSON.stringify(config, undefined, 2));
  return configPath;
}

/**
 * Loads and merges config for the given project directory.
 * Applies fta-check defaults, overridden by repo's fta.json if present.
 */
export function loadConfig(projectDirectory: string): FtaConfig {
  const repoConfig = readConfigFile(projectDirectory);
  return mergeConfig(DEFAULT_CONFIG, repoConfig);
}
