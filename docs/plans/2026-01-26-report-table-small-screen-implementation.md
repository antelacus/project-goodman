# Report Table Small-Screen Readability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep report tables readable on small screens by preserving full-width columns with horizontal scrolling.

**Architecture:** Use existing `overflow-x-auto` container and add a fixed minimum table width plus non-wrapping numeric cells. No data or logic changes; only layout classes in `ReportSection`.

**Tech Stack:** Next.js (React), Tailwind CSS, Vitest.

**Note:** Project rules require working directly on `development` (no worktree).

### Task 1: Report table small-screen layout

**Files:**
- Modify: `tests/unit/reports/report-section.test.tsx`
- Modify: `src/components/reports/ReportSection.tsx`
- Modify: `docs/versions/v4/features/performance-optimization/PHASE3-5_TRACK.md`

**Step 1: Write the failing test**

Add a new test to assert the table minimum width class and non-wrapping numeric cells.

```typescript
it('keeps report tables wide and numeric cells on one line', () => {
  const section: ReportSectionType = {
    id: 'liquidity',
    title: '流动性分析',
    metrics: [
      {
        name: '流动比率',
        toolName: 'current_ratio',
        value: 2.2733,
        formatted: '227.33%',
        previousValue: 3.064837,
        change: '-25.83%',
      },
    ],
    analysis: '测试分析',
    sourceDocuments: [],
  };

  const html = renderToStaticMarkup(
    React.createElement(ReportSection, {
      section,
      index: 0,
      isExpanded: true,
      onToggle: () => {},
      hasComparison: true,
      comparisonYear: '2023',
      primaryYear: '2024',
    })
  );

  expect(html).toContain('min-w-[640px]');
  expect(html).toContain('whitespace-nowrap');
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- --run tests/unit/reports/report-section.test.tsx`
Expected: FAIL because the class names are not present yet.

**Step 3: Implement minimal layout changes**

Update the table and numeric columns in `ReportSection`.

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm min-w-[640px]">
```

Add `whitespace-nowrap` to numeric headers and cells (including the change column).

```tsx
<th className="text-right py-2 px-3 font-medium text-neutral-600 whitespace-nowrap">
...
<td className="py-2 px-3 text-right font-mono text-neutral-800 whitespace-nowrap">
...
<td className="py-2 px-3 text-right font-mono text-neutral-500 whitespace-nowrap">
...
<td className="py-2 px-3 text-right whitespace-nowrap">
```

**Step 4: Update track document**

Add a new item under J. 报告输出正确性修复, e.g.

```
#### J5: 报表小屏可读性优化
- [x] 表格固定最小宽度并支持横向滚动
- [x] 数值列不换行以保证可读性
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- --run tests/unit/reports/report-section.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add tests/unit/reports/report-section.test.tsx src/components/reports/ReportSection.tsx docs/versions/v4/features/performance-optimization/PHASE3-5_TRACK.md
git commit -m "fix(v4.6): keep report tables readable on small screens"
```
