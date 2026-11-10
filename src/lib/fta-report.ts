import type { FtaResult } from "../fta-types.js";

const guidance = `The FTA score estimates how hard a file is to maintain, from its size, its branching and the
number of distinct things it works with. A file over the threshold needs a better design, not
the smallest change that gets it under.

Rethink the whole file, not only your change to it, and refactor it without changing what it
does:
1. First delete what the file does not need: unexported functions nothing calls, branches
   nothing reaches, logic written twice. Replace special cases, flags and near-duplicate
   functions with one general rule. Run this check again, and go on to step 2 only if it
   still fails.
2. List the jobs the file does. Where it does more than one, give a job its own module when
   that hides something from the rest: a decision callers need not know, or a side effect
   kept apart from pure logic. Its interface should be smaller than the code behind it;
   prefer the boundary that makes the rest of the file export the least. A split this check
   prompted is right when that boundary is real.

Do not pass by moving the lines you just added, or any chunk without such a boundary, into
another file, by writing the same logic in fewer or denser lines, by changing --threshold or
fta.json, or by committing past this check.`;

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
