import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  loadConfig,
  mergeConfig,
  readConfigFile,
  writeConfigToTemporaryFile,
  type FtaConfig,
} from "./fta-config.js";

describe("DEFAULT_CONFIG", () => {
  it("excludes test files by default", () => {
    expect(DEFAULT_CONFIG.exclude_filenames).toEqual(["*.test.{ts,tsx}"]);
  });
});

describe("mergeConfig", () => {
  it("returns default config when repo config is undefined", () => {
    const result = mergeConfig(DEFAULT_CONFIG);
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it("replaces exclude_filenames entirely when provided in repo config", () => {
    const repoConfig: FtaConfig = { exclude_filenames: [] };
    const result = mergeConfig(DEFAULT_CONFIG, repoConfig);
    expect(result.exclude_filenames).toEqual([]);
  });

  it("replaces with custom exclude_filenames from repo config", () => {
    const repoConfig: FtaConfig = { exclude_filenames: ["*.spec.ts"] };
    const result = mergeConfig(DEFAULT_CONFIG, repoConfig);
    expect(result.exclude_filenames).toEqual(["*.spec.ts"]);
  });

  it("preserves default keys not present in repo config", () => {
    const repoConfig: FtaConfig = { score_cap: 100 };
    const result = mergeConfig(DEFAULT_CONFIG, repoConfig);
    expect(result.exclude_filenames).toEqual(DEFAULT_CONFIG.exclude_filenames);
    expect(result.score_cap).toBe(100);
  });

  it("allows repo config to override multiple keys", () => {
    const repoConfig: FtaConfig = {
      exclude_filenames: ["*.e2e.ts"],
      exclude_directories: ["/custom"],
      score_cap: 50,
    };
    const result = mergeConfig(DEFAULT_CONFIG, repoConfig);
    expect(result.exclude_filenames).toEqual(["*.e2e.ts"]);
    expect(result.exclude_directories).toEqual(["/custom"]);
    expect(result.score_cap).toBe(50);
  });
});

describe("readConfigFile", () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), "fta-config-test-"));
  });

  it("returns undefined when fta.json does not exist", () => {
    const result = readConfigFile(temporaryDirectory);
    expect(result).toBeUndefined();
  });

  it("reads and parses fta.json when it exists", () => {
    const config = { exclude_filenames: ["*.custom.ts"] };
    writeFileSync(path.join(temporaryDirectory, "fta.json"), JSON.stringify(config));

    const result = readConfigFile(temporaryDirectory);
    expect(result).toEqual(config);
  });
});

describe("writeConfigToTemporaryFile", () => {
  it("writes config to a temp file and returns the path", () => {
    const config: FtaConfig = { exclude_filenames: ["*.test.ts"] };
    const filePath = writeConfigToTemporaryFile(config);

    expect(existsSync(filePath)).toBe(true);
    expect(filePath).toContain("fta-check-");
    expect(filePath).toMatch(/fta\.json$/u);

    const content = JSON.parse(readFileSync(filePath, "utf8")) as FtaConfig;
    expect(content).toEqual(config);
  });
});

describe("loadConfig", () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), "fta-config-test-"));
  });

  it("returns default config when no fta.json exists", () => {
    const result = loadConfig(temporaryDirectory);
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it("merges repo config with defaults", () => {
    const repoConfig = { score_cap: 200 };
    writeFileSync(path.join(temporaryDirectory, "fta.json"), JSON.stringify(repoConfig));

    const result = loadConfig(temporaryDirectory);
    expect(result.score_cap).toBe(200);
    expect(result.exclude_filenames).toEqual(DEFAULT_CONFIG.exclude_filenames);
  });

  it("allows repo config to clear exclude_filenames with empty array", () => {
    const repoConfig = { exclude_filenames: [] };
    writeFileSync(path.join(temporaryDirectory, "fta.json"), JSON.stringify(repoConfig));

    const result = loadConfig(temporaryDirectory);
    expect(result.exclude_filenames).toEqual([]);
  });
});
