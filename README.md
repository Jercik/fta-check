# fta-check

A thin wrapper around [FTA (Fast TypeScript Analyzer)](https://github.com/sgb-io/fta) that provides actionable error messages for automated code quality checks and AI agent guidance.

## Installation

```bash
npm install --save-dev fta-check fta-cli
# or
pnpm add -D fta-check fta-cli
# or
yarn add -D fta-check fta-cli
```

**Note**: `fta-cli` is a peer dependency and must be installed alongside `fta-check`. The `fta-check` CLI executes the `fta` binary directly from your PATH (no hard dependency on pnpm). Ensure `fta-cli` is installed locally so `fta` is available.

## Usage

```bash
# Analyze current directory
npx fta-check
# or
pnpm exec fta-check

# Analyze specific directory
npx fta-check ./src

# Show success message (silent by default)
npx fta-check --verbose

# Show help
npx fta-check --help
```

### Output Behavior

`fta-check` follows Unix conventions:

- **Silent on success**: No output when all files pass (exit code 0)
- **Verbose mode**: Use `-v` or `--verbose` to see a success message
- **Violations reported to stderr**: All output goes to stderr, keeping stdout clean for piping

## Configuration

### Default Settings

`fta-check` applies sensible defaults that exclude test files from analysis:

```json
{
  "exclude_filenames": ["*.test.{ts,tsx}"]
}
```

This means most projects don't need an `fta.json` file at all.

### Customizing Configuration

Create an `fta.json` file in your project root to customize settings. Each key you specify **completely replaces** the corresponding default (no merging). See the [official FTA configuration docs](https://ftaproject.dev/docs/configuration) for all available options.

To include test files in analysis, override the default with an empty array:

```json
{
  "exclude_filenames": []
}
```

Use `--threshold` (not `score_cap`) with `fta-check` to control which files are reported as violations while ensuring a detailed report is generated.

### Troubleshooting

- Error: `FTA CLI not found on PATH`
  - Install the peer dependency in your project: `npm i -D fta-cli` (or `yarn add -D fta-cli`, `pnpm add -D fta-cli`).
  - Verify `npx fta --version` works in your project directory.

## What does it do?

`fta-check` runs FTA analysis and formats the output to show:

- **File-level metrics**: Complexity scores, maintainability ratings, and Halstead metrics
- **Actionable recommendations**: Clear guidance on which files need attention and how to improve them
- **Machine-parseable output**: Clean text output to stderr, suitable for CI pipelines and scripting

## Example Output

When violations are found, `fta-check` outputs detailed analysis to stderr:

```
The code was statically analyzed and several complexity issues were found:

FTA Score Violations (threshold: 60)

The FTA score combines Halstead complexity, cyclomatic complexity, and lines of code
to measure maintainability. Higher scores indicate files that are more difficult to maintain.

KEY INSIGHT: The most effective way to reduce FTA scores is to EXTRACT functionality
   into separate files. This is an opportunity to identify reusable code that could
   benefit other parts of your codebase. Small optimizations within a file rarely
   make a significant impact on the FTA score.

X src/complex-service.ts
   FTA Score: 72.45 (Needs Improvement)
   Lines: 285 | Cyclomatic Complexity: 18

   Halstead Metrics:
   - Unique operators: 24 | Unique operands: 89
   - Total operators: 412 | Total operands: 523
   - Volume: 4521.32 | Difficulty: 42.15
   - Estimated bugs: 1.51

   How to improve:
   - Extract functionality into separate files (most effective for reducing FTA)
   - Consider splitting into 2-3 modules by feature or concern
   - Complex operations detected (difficulty: 42.2) - extract into helper functions
   - High bug probability (1.51) - split complex logic for better testing
   - Note: Small refactors within the file won't significantly reduce FTA

Found 1 file(s) exceeding threshold of 60
```

When all files pass (with `--verbose`):

```
All files pass FTA threshold check (threshold: 60)
```

## Development

The `@j4k/oxlint-config` dev dependency lives on the private Forge registry `code.j4k.dev`, and `pnpm-workspace.yaml` routes the `@j4k` scope to it. Before `pnpm install` can resolve it, add an auth token for that registry to your user `~/.npmrc`:

```
//code.j4k.dev/api/packages/j4k/npm/:_authToken=YOUR_TOKEN
```

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Watch mode for development
pnpm run dev

# Test locally
node ./bin/fta-check --help
```

## License

MIT © Łukasz Jerciński
