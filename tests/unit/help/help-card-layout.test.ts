import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HelpPage from "@/app/(workspace)/help/page";

// Ensure the module cards place the icon to the left of the text.
describe("HelpPage module cards", () => {
  it("renders three cards with horizontal icon-text layout", () => {
    const html = renderToStaticMarkup(React.createElement(HelpPage));
    const matches = html.match(/flex items-start gap-4/g) ?? [];

    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});
