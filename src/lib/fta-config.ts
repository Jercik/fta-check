import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * FTA configuration schema matching fta.json format.
 * All keys are optional - missing keys use FTA's built-in defaults.
 */
interface FtaConfig {
  output_limit?: number;
  score_cap?: number;
  include_comments?: boolean;
  exclude_under?: number;
  exclude_directories?: string[];
  exclude_filenames?: string[];
  extensions?: string[];
}

/**
 * Default config applied by fta-check.
 * These defaults can be overridden per-key by a repo's fta.json.
 */
const DEFAULT_CONFIG: FtaConfig = {
  exclude_filenames: ["*.test.{ts,tsx}"],
};

function findNearestConfigFile(directory: string): string | undefined {
  const candidate = path.join(directory, "fta.json");
  if (existsSync(candidate)) {
    return candidate;
  }
  const parent = path.dirname(directory);
  return parent === directory ? undefined : findNearestConfigFile(parent);
}

function readConfigFile(configPath: string): FtaConfig {
  try {
    const content = readFileSync(configPath, "utf8");
    return JSON.parse(content) as FtaConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SyntaxError(`Invalid JSON in ${configPath}: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
}

/**
 * Merges default config with repo config using "replace per key" strategy.
 * If a key exists in repoConfig, it completely replaces the default.
 * Keys not in repoConfig use the default value.
 */
function mergeConfig(defaultConfig: FtaConfig, repoConfig?: FtaConfig): FtaConfig {
  if (repoConfig === undefined) {
    return { ...defaultConfig };
  }

  // Spread operator handles "replace per key" - repo config overwrites defaults
  return { ...defaultConfig, ...repoConfig };
}

export function withTemporaryConfigFile<T>(config: FtaConfig, use: (configPath: string) => T): T {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "fta-check-"));
  try {
    const configPath = path.join(temporaryDirectory, "fta.json");
    writeFileSync(configPath, JSON.stringify(config, undefined, 2));
    return use(configPath);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

export function loadConfig(projectDirectory: string): FtaConfig {
  const configPath = findNearestConfigFile(path.resolve(projectDirectory));
  const repoConfig = configPath === undefined ? undefined : readConfigFile(configPath);
  return mergeConfig(DEFAULT_CONFIG, repoConfig);
}
