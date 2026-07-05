import js from "@eslint/js";
import { config, configs } from "typescript-eslint";

export default config(
  {
    ignores: [
      "./dist/**/*",
      "./prettier.config.js",
    ],
  },
  js.configs.recommended,
  ...configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
    },
  }
);
