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

# Show help
npx fta-check --help
```

## Configuration

Configure FTA using an `fta.json` file in your project root—see the [official FTA configuration docs](https://ftaproject.dev/docs/configuration) for all available options. Use `--threshold` (not `score_cap`) with `fta-check` to control which files are reported as violations while ensuring a detailed report is generated.

### Troubleshooting

- Error: `FTA CLI not found on PATH`
  - Install the peer dependency in your project: `npm i -D fta-cli` (or `yarn add -D fta-cli`, `pnpm add -D fta-cli`).
  - Verify `npx fta --version` works in your project directory.

## What does it do?

`fta-check` runs FTA analysis and formats the output to show:

- **File-level metrics**: Complexity scores, maintainability ratings, and Halstead metrics
- **Actionable recommendations**: Clear guidance on which files need attention
- **Human-readable reports**: Color-coded output with severity indicators

## Example Output

```

Analyzing TypeScript files...

⚠️ High Complexity Files:

src/complex-service.ts
Cyclomatic Complexity: 45 (threshold: 20)
Maintainability: 42.3 (threshold: 65)
→ Consider refactoring this file into smaller functions

✓ 12 files analyzed
⚠️ 1 file needs attention

```

## Development

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
