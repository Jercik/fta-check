import type { FtaResult } from "../fta-types.js";

function generateSuggestions(result: FtaResult): string[] {
  const suggestions: string[] = [
    "Extract functionality into separate files (most effective for reducing FTA)",
  ];
  if (result.line_count > 100) {
    suggestions.push("Identify reusable components/utilities that could be extracted and shared");
  }
  if (result.cyclo > 10) {
    suggestions.push(
      `Extract complex conditional logic into dedicated modules (cyclomatic: ${result.cyclo.toString()})`,
    );
  }
  if (result.line_count > 300) {
    suggestions.push("This file is too large - split into 3-4 focused modules by responsibility");
  } else if (result.line_count > 200) {
    suggestions.push("Consider splitting into 2-3 modules by feature or concern");
  } else if (result.line_count > 100) {
    suggestions.push("Look for groups of related functions to extract as modules");
  }
  if (result.halstead.difficulty > 40) {
    suggestions.push(
      `Complex operations detected (difficulty: ${result.halstead.difficulty.toFixed(1)}) - extract into helper functions`,
    );
  }
  if (result.halstead.bugs > 1) {
    suggestions.push(
      `High bug probability (${result.halstead.bugs.toFixed(2)}) - split complex logic for better testing`,
    );
  }
  suggestions.push("Note: Small refactors within the file won't significantly reduce FTA");
  return suggestions;
}

function formatViolation(result: FtaResult): string {
  const h = result.halstead;
  const suggestions = generateSuggestions(result)
    .map((s) => `   - ${s}`)
    .join("\n");
  return `
X ${result.file_name}
   FTA Score: ${result.fta_score.toFixed(2)} (${result.assessment})
   Lines: ${result.line_count.toString()} | Cyclomatic Complexity: ${result.cyclo.toString()}

   Halstead Metrics:
   - Unique operators: ${h.uniq_operators.toString()} | Unique operands: ${h.uniq_operands.toString()}
   - Total operators: ${h.total_operators.toString()} | Total operands: ${h.total_operands.toString()}
   - Volume: ${h.volume.toFixed(2)} | Difficulty: ${h.difficulty.toFixed(2)}
   - Estimated bugs: ${h.bugs.toFixed(2)}

   How to improve:
${suggestions}
`.trim();
}

export function printReport(violations: FtaResult[], threshold: number): void {
  console.error("\nThe code was statically analyzed and several complexity issues were found:\n");
  console.error(`FTA Score Violations (threshold: ${threshold.toString()})\n`);
  console.error(
    "The FTA score combines Halstead complexity, cyclomatic complexity, and lines of code",
  );
  console.error(
    "to measure maintainability. Higher scores indicate files that are more difficult to maintain.\n",
  );
  console.error(
    "KEY INSIGHT: The most effective way to reduce FTA scores is to EXTRACT functionality",
  );
  console.error(
    "   into separate files. This is an opportunity to identify reusable code that could",
  );
  console.error(
    "   benefit other parts of your codebase. Small optimizations within a file rarely",
  );
  console.error("   make a significant impact on the FTA score.\n");

  for (const [index, v] of violations.entries()) {
    console.error(formatViolation(v));
    if (index < violations.length - 1) {
      console.error();
    }
  }

  console.error(
    `\nFound ${violations.length.toString()} file(s) exceeding threshold of ${threshold.toString()}`,
  );
}
