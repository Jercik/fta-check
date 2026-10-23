# fta-check

Source: https://code.j4k.dev/j4k-oss/fta-check. github.com/Jercik/fta-check is a read-only mirror; open issues and pull requests on the Forge.

A thin wrapper around [FTA (Fast TypeScript Analyzer)](https://github.com/sgb-io/fta) that provides actionable error messages for automated code quality checks and AI agent guidance.

Requires Node.js 24.15.0 or later.

## Installation

`fta-check` is published only as `@j4k-oss/fta-check` on the `code.j4k.dev` registry, which reads anonymously. The unscoped `fta-check` package on npmjs.org is deprecated and gets no updates.

Without a registry mapping, a bare `@j4k-oss/fta-check` command looks on npmjs.org, finds nothing, and fails with a 404. Map the scope to the Forge registry by adding this line to `~/.npmrc` once:

```
@j4k-oss:registry=https://code.j4k.dev/api/packages/j4k-oss/npm/
```

The inline flag in the commands below is enough for a single `npx` run. Keep the `~/.npmrc` line for global installs: `npm update -g` and `npm outdated -g` read the registry from the configuration and would otherwise look the scoped name up on npmjs.org.

Run it once without installing:

```bash
npx -y --@j4k-oss:registry=https://code.j4k.dev/api/packages/j4k-oss/npm/ @j4k-oss/fta-check@latest ./src
```

Install the `fta-check` command globally:

```bash
npm install -g --@j4k-oss:registry=https://code.j4k.dev/api/packages/j4k-oss/npm/ @j4k-oss/fta-check
```

If you installed the unscoped package globally before, run `npm uninstall -g fta-check` before installing. Both packages provide the `fta-check` command, so `npm install -g` stops with `EEXIST`.

Add it to an npm project:

```bash
npm install --save-dev --@j4k-oss:registry=https://code.j4k.dev/api/packages/j4k-oss/npm/ @j4k-oss/fta-check fta-cli
```

Also commit the mapping line to the project's `.npmrc`, so collaborators and CI resolve the scope from the Forge. Without a mapping in the user or project configuration, a later plain `npm install` looks the scope up on npmjs.org and fails with a 404.

In a pnpm project, map the scope in `pnpm-workspace.yaml` and exempt it from `minimumReleaseAge`, then add the package:

```yaml
registries:
  "@j4k-oss": https://code.j4k.dev/api/packages/j4k-oss/npm/
minimumReleaseAgeExclude:
  - "@j4k-oss/*"
```

```bash
pnpm add -D @j4k-oss/fta-check fta-cli
```

**Note**: `fta-cli` is a peer dependency and must be installed alongside `fta-check`. `fta-check` resolves the installed `fta-cli` package and runs its platform binary directly, bypassing the `fta` command, which fails when the install path contains a space.

## Usage

The examples run the globally installed `fta-check` command. In a project that has it as a dev dependency, run `pnpm exec fta-check` or call it from a package script.

```bash
# Analyze current directory
fta-check

# Analyze specific directory
fta-check ./src

# Show success message (silent by default)
fta-check --verbose

# Show help
fta-check --help
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

- Error: `fta-cli not found`
  - Install the peer dependency in your project: `npm i -D fta-cli` (or `yarn add -D fta-cli`, `pnpm add -D fta-cli`).

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
