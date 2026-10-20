import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { loadConfig, withTemporaryConfigFile } from "./fta-config.js";

describe("withTemporaryConfigFile", () => {
  it("passes the callback a fta.json holding the config and returns the callback's result", () => {
    const result = withTemporaryConfigFile({ exclude_filenames: ["*.test.ts"] }, (configPath) => ({
      configPath,
      content: JSON.parse(readFileSync(configPath, "utf8")),
    }));

    expect(result.configPath).toMatch(/fta-check-[^/]+\/fta\.json$/u);
    expect(result.content).toStrictEqual({ exclude_filenames: ["*.test.ts"] });
  });

  it("removes the temporary directory once the callback returns", () => {
    const configPath = withTemporaryConfigFile({}, (path_) => path_);

    expect(existsSync(path.dirname(configPath))).toBe(false);
  });

  it("removes the temporary directory and rethrows when the callback throws", () => {
    let configPath = "";

    expect(() =>
      withTemporaryConfigFile({}, (path_) => {
        configPath = path_;
        throw new Error("fta failed");
      }),
    ).toThrow("fta failed");
    expect(existsSync(path.dirname(configPath))).toBe(false);
  });
});

describe("loadConfig", () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), "fta-config-test-"));
  });

  it("returns default config when no fta.json exists", () => {
    const result = loadConfig(temporaryDirectory);
    expect(result).toStrictEqual({ exclude_filenames: ["*.test.{ts,tsx}"] });
  });

  it("merges repo config with defaults", () => {
    const repoConfig = { score_cap: 200 };
    writeFileSync(path.join(temporaryDirectory, "fta.json"), JSON.stringify(repoConfig));

    const result = loadConfig(temporaryDirectory);
    expect(result).toStrictEqual({
      exclude_filenames: ["*.test.{ts,tsx}"],
      score_cap: 200,
    });
  });

  it("allows repo config to clear exclude_filenames with empty array", () => {
    const repoConfig = { exclude_filenames: [] };
    writeFileSync(path.join(temporaryDirectory, "fta.json"), JSON.stringify(repoConfig));

    const result = loadConfig(temporaryDirectory);
    expect(result).toStrictEqual({ exclude_filenames: [] });
  });

  it("allows repo config to replace exclude_filenames", () => {
    const repoConfig = { exclude_filenames: ["*.spec.ts"] };
    writeFileSync(path.join(temporaryDirectory, "fta.json"), JSON.stringify(repoConfig));

    const result = loadConfig(temporaryDirectory);
    expect(result).toStrictEqual({ exclude_filenames: ["*.spec.ts"] });
  });

  it("throws a useful error for invalid fta.json", () => {
    writeFileSync(path.join(temporaryDirectory, "fta.json"), "{ invalid");

    expect(() => loadConfig(temporaryDirectory)).toThrow("Invalid JSON");
  });
});
