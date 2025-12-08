import { performStructuredExtraction } from './src/lib/structured-extraction';

const SAMPLE_TEXT = `
2024年度利润表

一、营业收入                    5,000,000.00
减：营业成本                    3,000,000.00
    税金及附加                    100,000.00
二、净利润                        585,000.00
`;

async function test() {
  const result: any = await performStructuredExtraction(SAMPLE_TEXT, 'income_statement');
  console.log("Document Type:", result.documentType);
  console.log("Year:", result.year);
  console.log("Period:", result.period);
  console.log("Metrics count:", result.metrics?.length || 0);

  if (result.metrics) {
    const metrics = result.metrics;
    console.log("\nAll metrics:");
    metrics.forEach((m: any, i: number) => {
      console.log(`  ${i + 1}. ${m.name} = ${m.value} ${m.unit}`);
    });

    // Check for duplicates
    const names = metrics.map((m: any) => m.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      console.log("\n⚠️  DUPLICATES FOUND!");
      const duplicates = names.filter((name: string, index: number) => names.indexOf(name) !== index);
      console.log("Duplicate metric names:", [...new Set(duplicates)]);
    } else {
      console.log("\n✓ No duplicate metric names");
    }
  }
}

test().catch(console.error);
