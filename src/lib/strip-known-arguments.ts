export function stripKnownArguments(
  arguments_: string[],
  knownArguments: readonly { name: string; takesValue: boolean }[],
): string[] {
  const out: string[] = [];
  for (let index = 0; index < arguments_.length; index++) {
    const argument = arguments_[index];
    if (argument === undefined) {
      continue;
    }

    const exactMatch = knownArguments.find(({ name }) => argument === name);
    if (exactMatch !== undefined) {
      if (exactMatch.takesValue) {
        const next = arguments_[index + 1];
        if (next !== undefined && !next.startsWith("-")) {
          index++;
        }
      }
      continue;
    }

    const assignmentMatch = knownArguments.find(
      ({ name, takesValue }) => takesValue && argument.startsWith(`${name}=`),
    );
    if (assignmentMatch !== undefined) {
      continue;
    }

    out.push(argument);
  }
  return out;
}
