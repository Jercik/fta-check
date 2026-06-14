import { stripKnownArguments } from "./strip-known-arguments.js";

const WRAPPER_ARGUMENTS = [
  { name: "--threshold", takesValue: true },
  { name: "-h", takesValue: false },
  { name: "--help", takesValue: false },
  { name: "-V", takesValue: false },
  { name: "--version", takesValue: false },
  { name: "-v", takesValue: false },
  { name: "--verbose", takesValue: false },
] as const;

export function buildPassThroughArguments(raw: string[]): string[] {
  return stripKnownArguments(raw, WRAPPER_ARGUMENTS);
}
