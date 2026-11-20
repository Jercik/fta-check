import { describe, expect, it } from "vitest";
import { createCliProgram } from "./create-cli-program.js";

describe("createCliProgram", () => {
  it("names the installed command in the usage line", () => {
    expect(createCliProgram().helpInformation()).toMatch(/^Usage: fta-check \[options\]\n/u);
  });
});
