// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

type FileCheckResult = {
  file: string;
  color: string;
};

const disallowedTailwindColors = [
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "rose",
  "sky",
  "teal",
  "violet",
];

const allowedPdfHexColors = new Set([
  "#111827", // gray-900
  "#374151", // gray-700
  "#6b7280", // gray-500
  "#e5e7eb", // gray-200
  "#f9fafb", // gray-50
  "#f59e0b", // yellow-500
  "#dc2626", // red-600
]);

const uiRoots = [
  join(process.cwd(), "src", "app"),
  join(process.cwd(), "src", "components"),
];

const uiFileFilter = (file: string) => file.endsWith(".tsx");

const collectFiles = (dir: string, filter: (file: string) => boolean): string[] => {
  const entries = readdirSync(dir);
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...collectFiles(fullPath, filter));
      continue;
    }

    if (filter(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
};

describe("UI theme palette", () => {
  it("avoids non-theme Tailwind color classes in UI", () => {
    const files = uiRoots.flatMap((root) => collectFiles(root, uiFileFilter));
    const violations: FileCheckResult[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");

      for (const color of disallowedTailwindColors) {
        if (content.includes(`-${color}-`)) {
          violations.push({ file, color });
        }
      }
    }

    if (violations.length > 0) {
      const details = violations
        .map((violation) => `${violation.file} -> ${violation.color}`)
        .join("\n");

      throw new Error(`Detected non-theme Tailwind colors:\n${details}`);
    }
  });

  it("keeps report PDF palette within theme colors", () => {
    const pdfFile = join(process.cwd(), "src", "lib", "reports", "pdf-generator.tsx");
    const content = readFileSync(pdfFile, "utf8");
    const hexValues = content.match(/#[0-9a-fA-F]{6}/g) ?? [];
    const violations = Array.from(new Set(hexValues))
      .map((value) => value.toLowerCase())
      .filter((value) => !allowedPdfHexColors.has(value));

    if (violations.length > 0) {
      throw new Error(`Detected non-theme PDF hex colors: ${violations.join(", ")}`);
    }
  });
});
