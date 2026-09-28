#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings";
import packageJson from "../package.json" with { type: "json" };
import { DEFAULT_THRESHOLD, getViolations, parseThresholdValue } from "./lib/fta-check.js";
import { printReport } from "./lib/fta-report.js";

function run(threshold: number, ftaArguments: string[], verbose: boolean): number {
  try {
    const violations = getViolations(threshold, ftaArguments);

    if (violations.length === 0) {
      if (verbose) {
        console.error(`All files pass FTA threshold check (threshold: ${threshold.toString()})`);
      }
      return 0;
    }

    printReport(violations, threshold);
    return 1;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

function main(argv: string[]): void {
  new Command()
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .showHelpAfterError("(add --help for additional information)")
    .showSuggestionAfterError()
    .option(
      "--threshold <number>",
      "FTA threshold (positive number)",
      parseThresholdValue,
      DEFAULT_THRESHOLD,
    )
    .option("-v, --verbose", "Show success message when all files pass")
    .action((options, command) => {
      const exitCode = run(options.threshold, command.args, options.verbose ?? false);
      process.exitCode = exitCode;
    })
    .parse(argv);
}

main(process.argv);
