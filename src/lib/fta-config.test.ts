import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { loadConfig, writeConfigToTemporaryFile } from "./fta-config.js";

describe("writeConfigToTemporaryFile", () => {
  it("writes config to a temp file and returns the path", () => {
    const config = { exclude_filenames: ["*.test.ts"] };
    const filePath = writeConfigToTemporaryFile(config);

    expect(existsSync(filePath)).toBe(true);
    expect(filePath).toContain("fta-check-");
    expect(filePath).toMatch(/fta\.json$/u);

    const content = JSON.parse(readFileSync(filePath, "utf8"));
    expect(content).toStrictEqual({ exclude_filenames: ["*.test.ts"] });
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
