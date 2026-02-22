import path from "node:path";
import { axkit } from "eslint-config-axkit";

const gitignorePath = path.join(import.meta.dirname, ".gitignore");
const axkitConfig = await axkit({ gitignorePath });
const baseConfig = Array.isArray(axkitConfig) ? axkitConfig : [axkitConfig];

export default [
  ...baseConfig,
  {
    rules: {
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
];
