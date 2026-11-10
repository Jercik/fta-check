import type { FtaResult } from "../fta-types.js";

// FTA 3 adds 16.2·ln(lines)·100/171 to the score of a file whose cyclomatic complexity is 3 or more, so 10% fewer lines is about 1 point.
const guidance = `The score is per file and mostly measures size: it rises with the line count and, less,
with the number of distinct operators and operands. Lowering it by 1 point takes about 10%
fewer lines. Removing branches while keeping their lines does not reliably lower it and can
raise it.

A score over the threshold is a reason to review the file, not to move code out of it:
1. Search the file for code it does not need (unexported functions nothing calls, branches
   nothing reaches, duplicated logic) and remove it; removing code nothing reaches changes no
   behavior. Writing the same logic in fewer or denser lines is not removing it.
2. Split the file only where you would with no threshold to pass: where the split hides a
   decision its callers need not know, or separates a side effect from pure logic.
3. If the file is still over the threshold and no such split exists, keep the file whole,
   leave this check failing, and report the file, its score and what you ruled out to the
   project owner. Moving code out to lower the score keeps the complexity and adds an
   interface to learn. Changing --threshold or fta.json, or committing past this check, is
   the owner's decision.`;

function formatViolation(result: FtaResult): string {
  const h = result.halstead;

  return `
X ${result.file_name}
   FTA Score: ${result.fta_score.toFixed(2)} (${result.assessment})
   Lines: ${result.line_count.toString()} | Cyclomatic Complexity: ${result.cyclo.toString()}

   Halstead Metrics:
   - Unique operators: ${h.uniq_operators.toString()} | Unique operands: ${h.uniq_operands.toString()}
   - Total operators: ${h.total_operators.toString()} | Total operands: ${h.total_operands.toString()}
   - Volume: ${h.volume.toFixed(2)} | Difficulty: ${h.difficulty.toFixed(2)}
   - Estimated bugs: ${h.bugs.toFixed(2)}
`.trim();
}

export function printReport(violations: FtaResult[], threshold: number): void {
  console.error(`\nFTA Score Violations (threshold: ${threshold.toString()})\n`);

  for (const violation of violations) {
    console.error(`${formatViolation(violation)}\n`);
  }

  console.error(`${guidance}\n`);
  console.error(
    `Found ${violations.length.toString()} file(s) exceeding threshold of ${threshold.toString()}`,
  );
}
