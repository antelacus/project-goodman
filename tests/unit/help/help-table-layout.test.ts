import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage from "@/app/(workspace)/about/page";

// The document types table was moved from Help to About page.
// Ensure mobile table container supports horizontal scrolling
// and has a minimum table width to prevent squashed columns.
describe("AboutPage table layout", () => {
  it("wraps the table in an overflow container with min width", () => {
    const html = renderToStaticMarkup(React.createElement(AboutPage));

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-w-[720px]");
  });

  it("contains document type categories", () => {
    const html = renderToStaticMarkup(React.createElement(AboutPage));

    expect(html).toContain("财务报表");
    expect(html).toContain("法规准则");
    expect(html).toContain("其他信息");
  });
});
