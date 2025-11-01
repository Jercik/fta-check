import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
import { includeIgnoreFile } from "@eslint/compat";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { join } from "node:path";
import { defineConfig } from "eslint/config";

const gitignorePath = join(import.meta.dirname, ".gitignore");

export default defineConfig(
  includeIgnoreFile(gitignorePath, "Copy patterns from .gitignore"),
  {
    name: "Ignore config files",
    ignores: ["*.config.{js,mjs,mts,ts}"],
  },
  {
    name: "Base config for all JS/TS files",
    files: ["**/*.{js,ts}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      unicorn.configs.recommended,
    ],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Security rules
      "no-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // Correctness rules
      "no-return-assign": ["error", "always"],
      radix: ["error", "as-needed"],
      "guard-for-in": "error",
      "prefer-object-has-own": "error",

      // Clarity rules
      "prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],
      "require-unicode-regexp": "error",
      "no-extend-native": "error",
      "no-new-wrappers": "error",
      "no-implicit-coercion": ["error", { allow: ["!!"] }],

      // TypeScript-specific rules
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  eslintConfigPrettier,
);
