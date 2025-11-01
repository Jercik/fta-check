#!/usr/bin/env node

import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import {
  DEFAULT_THRESHOLD,
  getViolations,
  parseThresholdValue,
} from "./lib/fta-check.js";
import { printReport } from "./lib/fta-report.js";

type CliOptions = {
  threshold: number;
};

function run(threshold: number): number {
  try {
    const violations = getViolations(threshold);

    if (violations.length === 0) {
      console.log(
        `✅ All files pass FTA threshold check (threshold: ${threshold.toString()})`,
      );
      return 0;
    }

    printReport(violations, threshold);
    return 1;
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}

function main(argv: string[]): void {
  const program = new Command();

  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version)
    .allowExcessArguments(false)
    .showHelpAfterError()
    .option(
      "--threshold <number>",
      "FTA threshold (positive number)",
      parseThresholdValue,
      DEFAULT_THRESHOLD,
    )
    .action(() => {
      const { threshold } = program.opts<CliOptions>();
      const exitCode = run(threshold);
      process.exitCode = exitCode;
    });

  program.parse(argv);
}

main(process.argv);
