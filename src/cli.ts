#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings";
import packageJson from "../package.json" with { type: "json" };
import { DEFAULT_THRESHOLD, getViolations, parseThresholdValue } from "./lib/fta-check.js";
import { printReport } from "./lib/fta-report.js";
import { stripKnownArguments } from "./lib/strip-known-arguments.js";

// Flags the commander wrapper consumes itself; they must not be forwarded to fta.
const CLI_OWNED_ARGUMENTS = [
  { name: "--threshold", takesValue: true },
  { name: "-h", takesValue: false },
  { name: "--help", takesValue: false },
  { name: "-V", takesValue: false },
  { name: "--version", takesValue: false },
  { name: "-v", takesValue: false },
  { name: "--verbose", takesValue: false },
] as const;

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
    .action((options) => {
      const raw = argv.slice(2);
      const passThrough = stripKnownArguments(raw, CLI_OWNED_ARGUMENTS);
      const exitCode = run(options.threshold, passThrough, options.verbose ?? false);
      process.exitCode = exitCode;
    })
    .parse(argv);
}

main(process.argv);
