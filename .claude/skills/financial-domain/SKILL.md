---
name: financial-domain
description: Enforces financial domain conventions when working with financial calculations, metrics, Chinese financial terminology, or files in src/lib/financial/
---

# Financial Domain Conventions

Apply these rules when working with financial code in this project.

## Metric Names

Always use constants from `src/lib/financial/metric-names.ts`:

```typescript
// CORRECT
import { METRIC_NAMES } from '@/lib/financial/metric-names';
const metric = METRIC_NAMES.TOTAL_ASSETS;

// WRONG - hardcoded strings
const metric = '总资产';
```

## Chinese Financial Terminology

Use standard Chinese accounting terms:

| English | Chinese | Constant Key |
|---------|---------|--------------|
| Total Assets | 总资产 | TOTAL_ASSETS |
| Total Liabilities | 总负债 | TOTAL_LIABILITIES |
| Net Profit | 净利润 | NET_PROFIT |
| Operating Revenue | 营业收入 | OPERATING_REVENUE |
| Current Ratio | 流动比率 | CURRENT_RATIO |
| Debt-to-Equity Ratio | 资产负债率 | DEBT_RATIO |

## Calculation Functions

All financial calculation functions in `src/lib/financial/preset-functions.ts` must:

1. **Handle division by zero** - Return 0 or null, never Infinity
2. **Have explicit return types** - No inferred types for financial calculations
3. **Validate inputs** - Check for null/undefined before calculating
4. **Document edge cases** - Comment non-obvious business rules

```typescript
// CORRECT
function calculateDebtRatio(totalDebt: number, totalAssets: number): number {
  // Return 0 when assets are zero (company-specific rule)
  if (totalAssets === 0) return 0;
  return totalDebt / totalAssets;
}

// WRONG - no zero handling
function calculateDebtRatio(totalDebt: number, totalAssets: number): number {
  return totalDebt / totalAssets; // Could return Infinity!
}
```

## Financial Data Validation

Use Zod schemas from `src/lib/financial/schema.ts` for all financial data:

```typescript
import { financialDataSchema } from '@/lib/financial/schema';

const result = financialDataSchema.safeParse(data);
if (!result.success) {
  // Handle validation error
}
```

## Precision Rules

- Currency values: 2 decimal places (元)
- Ratios/percentages: 2-4 decimal places
- Large numbers: Use appropriate units (万元, 亿元)

## Key Files Reference

- `src/lib/financial/preset-functions.ts` - 22 financial calculation functions
- `src/lib/financial/metric-names.ts` - Chinese metric name constants
- `src/lib/financial/schema.ts` - Zod validation schemas
- `src/lib/financial/validation.ts` - Financial data validators
