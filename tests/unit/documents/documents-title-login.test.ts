import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("Documents page title", () => {
  it("does not expose admin login trigger on the title", () => {
    const filePath = join(process.cwd(), "src", "app", "(workspace)", "documents", "page.tsx");
    const content = readFileSync(filePath, "utf8");

    expect(content).not.toContain("ref={triggerRef}");
    expect(content).not.toContain("cursor-pointer select-none");
  });
});
