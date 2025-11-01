/**
 * Builds an array of arguments to pass through to the FTA CLI,
 * excluding fta-check specific flags and help/version flags
 */
export function buildPassThroughArguments(raw: string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < raw.length; index++) {
    const a = raw[index] as string;
    // Strip our own flag and its value
    if (a === "--threshold") {
      const next = raw[index + 1] as string | undefined;
      if (next !== undefined && !next.startsWith("-")) index++;
      continue;
    }
    if (a.startsWith("--threshold=")) continue;
    // Let commander handle help/version, do not forward
    if (a === "-h" || a === "--help" || a === "-V" || a === "--version") {
      continue;
    }
    out.push(a);
  }
  return out;
}
