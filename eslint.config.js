import js from "@eslint/js";
import {defineConfig} from "eslint/config";
import { configs } from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["./dist/**/*", "./prettier.config.js", "./rollup.config.js"],
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
    settings: {},
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
