import { CommanderError } from "@commander-js/extra-typings";
import { describe, expect, it } from "vitest";
import { createCliProgram } from "./create-cli-program.js";

function usageErrorFor(arguments_: string[]): string {
  let errorOutput = "";
  const program = createCliProgram()
    .exitOverride()
    .configureOutput({
      writeErr: (text) => {
        errorOutput += text;
      },
    });
  expect(() => program.parse(arguments_, { from: "user" })).toThrow(CommanderError);
  return errorOutput;
}

describe("createCliProgram", () => {
  it("names the installed command in the usage line", () => {
    expect(createCliProgram().helpInformation()).toMatch(
      /^Usage: fta-check \[options\] \[directory\]\n/u,
    );
  });

  it("rejects a misspelled option with a suggestion", () => {
    expect(usageErrorFor(["--treshold", "50"])).toBe(
      "error: unknown option '--treshold'\n(Did you mean --threshold?)\n(add --help for additional information)\n",
    );
  });

  it("rejects a second directory", () => {
    expect(usageErrorFor(["src", "lib"])).toBe(
      "error: too many arguments. Expected 1 argument but got 2: src, lib.\n(add --help for additional information)\n",
    );
  });
});
