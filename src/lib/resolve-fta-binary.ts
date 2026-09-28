import { createRequire } from "node:module";
import path from "node:path";

// Mirrors fta-cli 3.x getBinaryPath(); its `fta` bin shells out unquoted and breaks on paths with spaces.
const binaryByPlatform: Record<string, string> = {
  "darwin-arm64": "fta-aarch64-apple-darwin/fta",
  "darwin-x64": "fta-x86_64-apple-darwin/fta",
  "linux-arm": "fta-arm-unknown-linux-musleabi/fta",
  "linux-arm64": "fta-aarch64-unknown-linux-musl/fta",
  "linux-x64": "fta-x86_64-unknown-linux-musl/fta",
  "win32-arm64": "fta-aarch64-pc-windows-msvc/fta.exe",
  "win32-x64": "fta-x86_64-pc-windows-msvc/fta.exe",
};

function locateFtaCliDirectory(): string {
  try {
    return path.dirname(createRequire(import.meta.url).resolve("fta-cli/package.json"));
  } catch (error) {
    throw new Error(
      "fta-cli not found. Please install 'fta-cli' (peer dependency) in your project and re-run: npm i -D fta-cli",
      { cause: error },
    );
  }
}

export function resolveFtaBinary(): string {
  const binary = binaryByPlatform[`${process.platform}-${process.arch}`];
  if (binary === undefined) {
    throw new Error(`fta-cli ships no binary for ${process.platform}-${process.arch}`);
  }
  return path.join(locateFtaCliDirectory(), "binaries", binary);
}
