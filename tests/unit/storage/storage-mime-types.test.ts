import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("Storage bucket mime types", () => {
  it("allows DOCX uploads in the document-files bucket", () => {
    const migrationsDir = join(process.cwd(), "supabase", "migrations");
    const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"));
    const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const hasDocxUpdate = files.some((file) => {
      const content = readFileSync(join(migrationsDir, file), "utf8");
      return content.includes("storage.buckets") && content.includes(docxMime);
    });

    expect(hasDocxUpdate).toBe(true);
  });
});
