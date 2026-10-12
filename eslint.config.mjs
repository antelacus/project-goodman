import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat configs only; FlatCompat can no longer load it.
export default defineConfig([
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "dist/**",
    "build/**",
    "scripts/**",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    // Stopgap (TD-028): 12 existing sites; back to "error" once they are fixed.
    // Same files as the "next" config, where the react-hooks plugin is defined.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
]);
