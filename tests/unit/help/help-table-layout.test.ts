import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HelpPage from "@/app/(workspace)/help/page";

// Ensure mobile table container supports horizontal scrolling
// and has a minimum table width to prevent squashed columns.
describe("HelpPage table layout", () => {
  it("wraps the table in an overflow container with min width", () => {
    const html = renderToStaticMarkup(React.createElement(HelpPage));

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-w-[720px]");
  });
});
