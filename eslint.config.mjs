import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global ignores for build artifacts and utility scripts
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "scripts/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
