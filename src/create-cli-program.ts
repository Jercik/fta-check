import type { CommanderError, CommandUnknownOpts } from "@commander-js/extra-typings";
import { Command } from "@commander-js/extra-typings";
import packageJson from "../package.json" with { type: "json" };
import type { CheckOptions } from "./lib/fta-check.js";
import { DEFAULT_THRESHOLD, getViolations, parseThresholdValue } from "./lib/fta-check.js";
import { printReport } from "./lib/fta-report.js";

// As with grep and diff, 1 is a verdict and 2 means no verdict was reached.
const exitStatus = { pass: 0, violations: 1, failure: 2 } as const;

function run(check: CheckOptions, verbose: boolean): number {
  const { threshold } = check;
  try {
    const violations = getViolations(check);

    if (violations.length === 0) {
      if (verbose) {
        console.error(`All files pass FTA threshold check (threshold: ${threshold.toString()})`);
      }
      return exitStatus.pass;
    }

    printReport(violations, threshold);
    return exitStatus.violations;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return exitStatus.failure;
  }
}

// Commander's own status for a usage error is 1, which would read as a violations verdict.
function exitForCommander(error: CommanderError): never {
  // oxlint-disable-next-line unicorn/no-process-exit -- Commander exits with its own status when this callback returns.
  process.exit(error.exitCode === 0 ? exitStatus.pass : exitStatus.failure);
}

export function createCliProgram(): CommandUnknownOpts {
  return new Command()
    .name("fta-check" satisfies keyof typeof packageJson.bin)
    .description(packageJson.description)
    .version(packageJson.version)
    .showHelpAfterError("(add --help for additional information)")
    .showSuggestionAfterError()
    .exitOverride(exitForCommander)
    .option(
      "--threshold <number>",
      "FTA threshold (positive number)",
      parseThresholdValue,
      DEFAULT_THRESHOLD,
    )
    .option("--config <file>", "fta.json to use instead of the nearest one")
    .option("-v, --verbose", "Show success message when all files pass")
    .argument("[directory]", "directory to analyze", ".")
    .action((directory, options) => {
      process.exitCode = run(
        { threshold: options.threshold, directory, configFile: options.config },
        options.verbose ?? false,
      );
    });
}
