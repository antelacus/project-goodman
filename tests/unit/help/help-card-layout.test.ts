import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HelpPage from "@/app/(workspace)/help/page";

// Ensure the core capability cards are rendered with centered layout.
describe("HelpPage core capability cards", () => {
  it("renders three capability cards with centered layout", () => {
    const html = renderToStaticMarkup(React.createElement(HelpPage));
    // New layout uses flex-col items-center text-center for each card
    const matches = html.match(/flex flex-col items-center text-center/g) ?? [];

    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("contains the three core capabilities", () => {
    const html = renderToStaticMarkup(React.createElement(HelpPage));

    expect(html).toContain("数据信息检索");
    expect(html).toContain("参数指标分析");
    expect(html).toContain("综合报告生成");
  });
});
