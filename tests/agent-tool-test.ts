/**
 * Agent Tool Comprehensive Test Script
 *
 * This script tests the agent's ability to use various tools correctly
 * by asking a series of questions and logging the responses.
 *
 * Usage:
 *   npx tsx tests/agent-tool-test.ts [--limit N] [--start N] [--category CATEGORY]
 *
 * Options:
 *   --limit N      Only run first N questions (default: all)
 *   --start N      Start from question N (1-indexed, default: 1)
 *   --category CAT Only run questions in specified category
 *   --base-url URL Override base URL (default: http://localhost:3000)
 *   --delay MS     Delay between questions in ms (default: 2000)
 */

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// Configuration
// ============================================================================

interface TestQuestion {
  id: number;
  category: string;
  question: string;
  expectedTool: string;
  testPurpose: string;
}

interface TestResult {
  id: number;
  category: string;
  question: string;
  expectedTool: string;
  answer: string;
  toolsCalled: string[];
  processEvents: Array<{ type: string; content: string }>;
  success: boolean;
  error?: string;
  duration: number;
  timestamp: string;
}

// Parse command line arguments
function parseArgs(): {
  limit: number;
  start: number;
  category: string | null;
  baseUrl: string;
  delay: number;
} {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let start = 1;
  let category: string | null = null;
  let baseUrl = "http://localhost:3000";
  let delay = 2000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--start" && args[i + 1]) {
      start = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--category" && args[i + 1]) {
      category = args[i + 1];
      i++;
    } else if (args[i] === "--base-url" && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (args[i] === "--delay" && args[i + 1]) {
      delay = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { limit, start, category, baseUrl, delay };
}

// ============================================================================
// Test Questions Database
// ============================================================================

const TEST_QUESTIONS: TestQuestion[] = [
  // -------------------------------------------------------------------------
  // Category 1: Raw Financial Data Queries - Balance Sheet Current Assets
  // -------------------------------------------------------------------------
  {
    id: 1,
    category: "balance_sheet_current_assets",
    question: "2024年的货币资金是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query monetary funds",
  },
  {
    id: 2,
    category: "balance_sheet_current_assets",
    question: "2023年的应收账款金额是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query accounts receivable",
  },
  {
    id: 3,
    category: "balance_sheet_current_assets",
    question: "2024年存货金额是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query inventory",
  },
  {
    id: 4,
    category: "balance_sheet_current_assets",
    question: "2024年流动资产合计是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query total current assets",
  },
  {
    id: 5,
    category: "balance_sheet_current_assets",
    question: "2023年的预付款项是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query prepayments",
  },

  // -------------------------------------------------------------------------
  // Category 2: Balance Sheet - Non-Current Assets
  // -------------------------------------------------------------------------
  {
    id: 6,
    category: "balance_sheet_noncurrent_assets",
    question: "2024年固定资产金额是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query fixed assets",
  },
  {
    id: 7,
    category: "balance_sheet_noncurrent_assets",
    question: "2023年无形资产金额是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query intangible assets",
  },
  {
    id: 8,
    category: "balance_sheet_noncurrent_assets",
    question: "2024年非流动资产合计是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query total non-current assets",
  },
  {
    id: 9,
    category: "balance_sheet_noncurrent_assets",
    question: "2024年资产总计是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query total assets",
  },

  // -------------------------------------------------------------------------
  // Category 3: Balance Sheet - Liabilities
  // -------------------------------------------------------------------------
  {
    id: 10,
    category: "balance_sheet_liabilities",
    question: "2024年短期借款是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query short-term borrowings",
  },
  {
    id: 11,
    category: "balance_sheet_liabilities",
    question: "2024年应付账款金额？",
    expectedTool: "query_financial_data",
    testPurpose: "Query accounts payable",
  },
  {
    id: 12,
    category: "balance_sheet_liabilities",
    question: "2024年流动负债合计是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query total current liabilities",
  },
  {
    id: 13,
    category: "balance_sheet_liabilities",
    question: "2024年负债总计是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query total liabilities",
  },

  // -------------------------------------------------------------------------
  // Category 4: Balance Sheet - Equity
  // -------------------------------------------------------------------------
  {
    id: 14,
    category: "balance_sheet_equity",
    question: "2024年股本金额是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query paid-in capital",
  },
  {
    id: 15,
    category: "balance_sheet_equity",
    question: "2024年未分配利润是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query retained earnings",
  },
  {
    id: 16,
    category: "balance_sheet_equity",
    question: "2024年所有者权益合计是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query total equity",
  },

  // -------------------------------------------------------------------------
  // Category 5: Income Statement
  // -------------------------------------------------------------------------
  {
    id: 17,
    category: "income_statement",
    question: "2024年营业收入是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query revenue",
  },
  {
    id: 18,
    category: "income_statement",
    question: "2024年营业成本是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query operating costs",
  },
  {
    id: 19,
    category: "income_statement",
    question: "2024年管理费用是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query administrative expenses",
  },
  {
    id: 20,
    category: "income_statement",
    question: "2024年财务费用是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query financial expenses",
  },
  {
    id: 21,
    category: "income_statement",
    question: "2024年营业利润是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query operating profit",
  },
  {
    id: 22,
    category: "income_statement",
    question: "2024年净利润是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query net profit",
  },

  // -------------------------------------------------------------------------
  // Category 6: Cash Flow Statement
  // -------------------------------------------------------------------------
  {
    id: 23,
    category: "cash_flow",
    question: "2024年经营活动现金流量净额是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query operating cash flow",
  },
  {
    id: 24,
    category: "cash_flow",
    question: "2024年投资活动现金流量净额是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query investing cash flow",
  },
  {
    id: 25,
    category: "cash_flow",
    question: "2024年筹资活动现金流量净额是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Query financing cash flow",
  },

  // -------------------------------------------------------------------------
  // Category 7: Multi-Year Comparison Queries
  // -------------------------------------------------------------------------
  {
    id: 26,
    category: "multi_year",
    question: "2023年和2024年的资产总计分别是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Multi-year total assets query",
  },
  {
    id: 27,
    category: "multi_year",
    question: "对比2023和2024年的净利润",
    expectedTool: "query_financial_data+evaluate_expression",
    testPurpose: "YoY net profit comparison",
  },
  {
    id: 28,
    category: "multi_year",
    question: "2024年的货币资金比2023年增长了多少？",
    expectedTool: "query_financial_data+evaluate_expression",
    testPurpose: "Growth calculation",
  },
  {
    id: 29,
    category: "multi_year",
    question: "2024年营业收入相比2023年增长率是多少？",
    expectedTool: "query_financial_data+evaluate_expression",
    testPurpose: "Growth rate percentage",
  },

  // -------------------------------------------------------------------------
  // Category 8: Liquidity Ratios
  // -------------------------------------------------------------------------
  {
    id: 30,
    category: "liquidity_ratios",
    question: "计算2024年的流动比率",
    expectedTool: "current_ratio",
    testPurpose: "Current ratio calculation",
  },
  {
    id: 31,
    category: "liquidity_ratios",
    question: "2024年的速动比率是多少？",
    expectedTool: "quick_ratio",
    testPurpose: "Quick ratio calculation",
  },
  {
    id: 32,
    category: "liquidity_ratios",
    question: "计算2024年的现金比率",
    expectedTool: "cash_ratio",
    testPurpose: "Cash ratio calculation",
  },
  {
    id: 33,
    category: "liquidity_ratios",
    question: "2024年营运资本是多少？",
    expectedTool: "working_capital",
    testPurpose: "Working capital calculation",
  },
  {
    id: 34,
    category: "liquidity_ratios",
    question: "2024年现金流量比率是多少？",
    expectedTool: "cash_flow_ratio",
    testPurpose: "Cash flow ratio calculation",
  },
  {
    id: 35,
    category: "liquidity_ratios",
    question: "对比2023和2024年流动比率的变化",
    expectedTool: "current_ratio+evaluate_expression",
    testPurpose: "Liquidity trend analysis",
  },

  // -------------------------------------------------------------------------
  // Category 9: Solvency Ratios
  // -------------------------------------------------------------------------
  {
    id: 36,
    category: "solvency_ratios",
    question: "计算2024年的资产负债率",
    expectedTool: "debt_to_asset_ratio",
    testPurpose: "Debt-to-asset ratio calculation",
  },
  {
    id: 37,
    category: "solvency_ratios",
    question: "2024年产权比率是多少？",
    expectedTool: "debt_to_equity_ratio",
    testPurpose: "Debt-to-equity ratio calculation",
  },
  {
    id: 38,
    category: "solvency_ratios",
    question: "计算2024年的权益乘数",
    expectedTool: "equity_multiplier",
    testPurpose: "Equity multiplier calculation",
  },
  {
    id: 39,
    category: "solvency_ratios",
    question: "2024年长期资本负债率是多少？",
    expectedTool: "long_term_capital_debt_ratio",
    testPurpose: "Long-term capital debt ratio",
  },
  {
    id: 40,
    category: "solvency_ratios",
    question: "计算2024年的利息保障倍数",
    expectedTool: "interest_coverage_ratio",
    testPurpose: "Interest coverage ratio",
  },
  {
    id: 41,
    category: "solvency_ratios",
    question: "2024年现金流量利息保障倍数是多少？",
    expectedTool: "cash_flow_interest_coverage",
    testPurpose: "Cash flow interest coverage",
  },
  {
    id: 42,
    category: "solvency_ratios",
    question: "计算2024年的现金流量与负债比率",
    expectedTool: "cash_flow_to_debt_ratio",
    testPurpose: "Cash flow to debt ratio",
  },

  // -------------------------------------------------------------------------
  // Category 10: Profitability Ratios
  // -------------------------------------------------------------------------
  {
    id: 43,
    category: "profitability_ratios",
    question: "计算2024年的销售毛利率",
    expectedTool: "gross_profit_margin",
    testPurpose: "Gross profit margin calculation",
  },
  {
    id: 44,
    category: "profitability_ratios",
    question: "2024年销售净利率是多少？",
    expectedTool: "net_profit_margin",
    testPurpose: "Net profit margin calculation",
  },
  {
    id: 45,
    category: "profitability_ratios",
    question: "计算2024年的总资产收益率(ROA)",
    expectedTool: "return_on_assets",
    testPurpose: "ROA calculation",
  },
  {
    id: 46,
    category: "profitability_ratios",
    question: "2024年净资产收益率(ROE)是多少？",
    expectedTool: "return_on_equity",
    testPurpose: "ROE calculation",
  },
  {
    id: 47,
    category: "profitability_ratios",
    question: "对2024年做杜邦分析",
    expectedTool: "dupont_roe",
    testPurpose: "DuPont analysis",
  },

  // -------------------------------------------------------------------------
  // Category 11: Efficiency Ratios
  // -------------------------------------------------------------------------
  {
    id: 48,
    category: "efficiency_ratios",
    question: "计算2024年的总资产周转率",
    expectedTool: "asset_turnover",
    testPurpose: "Asset turnover calculation",
  },
  {
    id: 49,
    category: "efficiency_ratios",
    question: "2024年存货周转率是多少？",
    expectedTool: "inventory_turnover",
    testPurpose: "Inventory turnover calculation",
  },
  {
    id: 50,
    category: "efficiency_ratios",
    question: "计算2024年的应收账款周转率",
    expectedTool: "receivables_turnover",
    testPurpose: "Receivables turnover calculation",
  },
  {
    id: 51,
    category: "efficiency_ratios",
    question: "2024年营运资本周转率是多少？",
    expectedTool: "working_capital_turnover",
    testPurpose: "Working capital turnover",
  },
  {
    id: 52,
    category: "efficiency_ratios",
    question: "计算2024年的总资产周转天数",
    expectedTool: "asset_turnover_days",
    testPurpose: "Asset turnover days calculation",
  },

  // -------------------------------------------------------------------------
  // Category 12: Expression Calculation Tests
  // -------------------------------------------------------------------------
  {
    id: 53,
    category: "expression_calculation",
    question: "如果资产负债率从50%变到60%，增长了多少百分点？",
    expectedTool: "evaluate_expression",
    testPurpose: "Simple difference calculation",
  },
  {
    id: 54,
    category: "expression_calculation",
    question: "净利润从1000万增长到1200万，增长率是多少？",
    expectedTool: "evaluate_expression",
    testPurpose: "Growth rate calculation",
  },

  // -------------------------------------------------------------------------
  // Category 13: Document Search Tests
  // -------------------------------------------------------------------------
  {
    id: 55,
    category: "document_search",
    question: "查找公司关于应收账款管理的政策",
    expectedTool: "search_documents",
    testPurpose: "Policy document search",
  },
  {
    id: 56,
    category: "document_search",
    question: "搜索公司的财务管理制度",
    expectedTool: "search_documents",
    testPurpose: "Financial policy search",
  },
  {
    id: 57,
    category: "document_search",
    question: "查找公司详细档案中的业务模式说明",
    expectedTool: "search_documents",
    testPurpose: "Business info search",
  },

  // -------------------------------------------------------------------------
  // Category 14: Regulation Search Tests
  // -------------------------------------------------------------------------
  {
    id: 58,
    category: "regulation_search",
    question: "应收账款坏账计提的会计准则是什么？",
    expectedTool: "search_regulations",
    testPurpose: "Accounting standards search",
  },
  {
    id: 59,
    category: "regulation_search",
    question: "存货跌价准备的相关规定？",
    expectedTool: "search_regulations",
    testPurpose: "Inventory impairment regulations",
  },
  {
    id: 60,
    category: "regulation_search",
    question: "收入确认的会计准则要求",
    expectedTool: "search_regulations",
    testPurpose: "Revenue recognition standards",
  },

  // -------------------------------------------------------------------------
  // Category 15: Complex Multi-Tool Questions
  // -------------------------------------------------------------------------
  {
    id: 61,
    category: "complex_analysis",
    question: "2024年短期偿债能力分析",
    expectedTool: "current_ratio+quick_ratio+cash_ratio",
    testPurpose: "Multi-ratio liquidity analysis",
  },
  {
    id: 62,
    category: "complex_analysis",
    question: "分析2024年的资产运营效率",
    expectedTool: "asset_turnover+inventory_turnover+receivables_turnover",
    testPurpose: "Efficiency analysis",
  },
  {
    id: 63,
    category: "complex_analysis",
    question: "2024年的现金流状况如何？",
    expectedTool: "query_financial_data+cash_flow_ratio",
    testPurpose: "Cash flow analysis",
  },

  // -------------------------------------------------------------------------
  // Category 16: Edge Cases
  // -------------------------------------------------------------------------
  {
    id: 64,
    category: "edge_cases",
    question: "2025年的净利润是多少？",
    expectedTool: "query_financial_data",
    testPurpose: "Future year handling - should return no data",
  },
  {
    id: 65,
    category: "edge_cases",
    question: "2020年的资产负债率？",
    expectedTool: "debt_to_asset_ratio",
    testPurpose: "Old year handling - may have no data",
  },

  // -------------------------------------------------------------------------
  // Category 17: Natural Language Variations
  // -------------------------------------------------------------------------
  {
    id: 66,
    category: "natural_language",
    question: "帮我查一下2024年账上有多少钱",
    expectedTool: "query_financial_data",
    testPurpose: "Colloquial expression for monetary funds",
  },
  {
    id: 67,
    category: "natural_language",
    question: "公司欠了多少钱？",
    expectedTool: "query_financial_data",
    testPurpose: "Informal debt query",
  },
  {
    id: 68,
    category: "natural_language",
    question: "ROE多少？",
    expectedTool: "return_on_equity",
    testPurpose: "Abbreviation handling",
  },
  {
    id: 69,
    category: "natural_language",
    question: "公司赚了多少钱？",
    expectedTool: "query_financial_data",
    testPurpose: "Colloquial profit query",
  },
  {
    id: 70,
    category: "natural_language",
    question: "毛利率怎么样？",
    expectedTool: "gross_profit_margin",
    testPurpose: "Informal ratio query",
  },
];

// ============================================================================
// SSE Stream Parser
// ============================================================================

interface ParsedResponse {
  answer: string;
  toolsCalled: string[];
  processEvents: Array<{ type: string; content: string }>;
  error?: string;
}

/**
 * Parse SSE stream from the chat API
 * Format: event: <type>\ndata: <json>\n\n
 */
async function parseSSEStream(response: Response): Promise<ParsedResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    return { answer: "", toolsCalled: [], processEvents: [], error: "No response body" };
  }

  const decoder = new TextDecoder();
  let answer = "";
  const toolsCalled: string[] = [];
  const processEvents: Array<{ type: string; content: string }> = [];
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events - format is: event: <type>\ndata: <json>\n\n
      // Split by double newline to get individual events
      const events = buffer.split("\n\n");
      buffer = events.pop() || ""; // Keep incomplete event in buffer

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        const lines = eventBlock.split("\n");
        let eventType = "";
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            eventData = line.slice(6);
          }
        }

        if (!eventData) continue;

        try {
          const parsed = JSON.parse(eventData);

          // Capture tool calls from tool_call event
          if (eventType === "tool_call" && parsed.tool) {
            if (!toolsCalled.includes(parsed.tool)) {
              toolsCalled.push(parsed.tool);
            }
          }

          // Capture process events for detailed logging
          if (eventType === "process" && parsed.type && parsed.content) {
            processEvents.push({
              type: parsed.type,
              content: parsed.content,
            });

            // Also extract tool name from process events
            if (parsed.type === "tool_call" && parsed.details?.tool) {
              if (!toolsCalled.includes(parsed.details.tool)) {
                toolsCalled.push(parsed.details.tool);
              }
            }
          }

          // Capture final answer from 'done' event
          if (eventType === "done") {
            if (parsed.answer) {
              answer = parsed.answer;
            } else if (parsed.output?.answer) {
              answer = parsed.output.answer;
            }
          }

          // Capture answer from 'complete' event (alternative format)
          if (eventType === "complete" && parsed.answer) {
            answer = parsed.answer;
          }
        } catch {
          // Skip non-JSON data
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { answer: answer.trim(), toolsCalled, processEvents };
}

// ============================================================================
// Test Runner
// ============================================================================

async function askQuestion(
  baseUrl: string,
  question: string,
  sessionId?: string
): Promise<ParsedResponse & { duration: number }> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionId ? `sessionId=${sessionId}` : "",
      },
      body: JSON.stringify({
        question,
        sessionId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        answer: "",
        toolsCalled: [],
        processEvents: [],
        error: `HTTP ${response.status}: ${errorText}`,
        duration: Date.now() - startTime,
      };
    }

    const parsed = await parseSSEStream(response);
    return {
      ...parsed,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      answer: "",
      toolsCalled: [],
      processEvents: [],
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests(): Promise<void> {
  const { limit, start, category, baseUrl, delay } = parseArgs();

  console.log("=".repeat(70));
  console.log("Agent Tool Comprehensive Test");
  console.log("=".repeat(70));
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Start: ${start}, Limit: ${limit === Infinity ? "all" : limit}`);
  console.log(`Category filter: ${category || "none"}`);
  console.log(`Delay between questions: ${delay}ms`);
  console.log("=".repeat(70));

  // Filter questions
  let questions = TEST_QUESTIONS;
  if (category) {
    questions = questions.filter((q) => q.category === category);
  }
  questions = questions.filter((q) => q.id >= start);
  questions = questions.slice(0, limit);

  console.log(`Running ${questions.length} questions...\n`);

  const results: TestResult[] = [];
  const sessionId = uuidv4(); // Use proper UUID format for API validation

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`[${i + 1}/${questions.length}] Q${q.id}: ${q.question}`);
    console.log(`  Expected: ${q.expectedTool}`);

    const response = await askQuestion(baseUrl, q.question, sessionId);

    const result: TestResult = {
      id: q.id,
      category: q.category,
      question: q.question,
      expectedTool: q.expectedTool,
      answer: response.answer,
      toolsCalled: response.toolsCalled,
      processEvents: response.processEvents,
      success: !response.error,
      error: response.error,
      duration: response.duration,
      timestamp: new Date().toISOString(),
    };

    results.push(result);

    // Print summary
    console.log(`  Tools called: ${response.toolsCalled.join(", ") || "none"}`);
    console.log(`  Duration: ${response.duration}ms`);
    if (response.error) {
      console.log(`  ERROR: ${response.error}`);
    } else {
      // Truncate answer for console
      const shortAnswer =
        response.answer.length > 100
          ? response.answer.substring(0, 100) + "..."
          : response.answer;
      console.log(`  Answer: ${shortAnswer}`);
    }
    console.log("");

    // Delay between questions to avoid rate limiting
    if (i < questions.length - 1) {
      await sleep(delay);
    }
  }

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(__dirname, "../docs/manual-test-log");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save JSON results
  const jsonPath = path.join(outputDir, `agent-test-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\nJSON results saved to: ${jsonPath}`);

  // Generate Markdown report
  const mdPath = path.join(outputDir, `agent-test-${timestamp}.md`);
  const mdContent = generateMarkdownReport(results);
  fs.writeFileSync(mdPath, mdContent);
  console.log(`Markdown report saved to: ${mdPath}`);

  // Print summary
  console.log("\n" + "=".repeat(70));
  console.log("TEST SUMMARY");
  console.log("=".repeat(70));
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  // Group by category
  const byCategory = new Map<string, TestResult[]>();
  for (const r of results) {
    const cat = byCategory.get(r.category) || [];
    cat.push(r);
    byCategory.set(r.category, cat);
  }

  console.log("\nBy Category:");
  for (const [cat, catResults] of Array.from(byCategory.entries())) {
    const catSuccess = catResults.filter((r) => r.success).length;
    console.log(`  ${cat}: ${catSuccess}/${catResults.length}`);
  }
}

function generateMarkdownReport(results: TestResult[]): string {
  const lines: string[] = [];

  lines.push("# Agent Tool Test Report");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push("");

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total Questions:** ${results.length}`);
  lines.push(`- **Successful:** ${successful}`);
  lines.push(`- **Failed:** ${failed}`);
  lines.push("");

  // Group by category
  const byCategory = new Map<string, TestResult[]>();
  for (const r of results) {
    const cat = byCategory.get(r.category) || [];
    cat.push(r);
    byCategory.set(r.category, cat);
  }

  // Results by category
  lines.push("## Results by Category");
  lines.push("");

  for (const [category, catResults] of Array.from(byCategory.entries())) {
    lines.push(`### ${category}`);
    lines.push("");

    for (const r of catResults) {
      lines.push(`#### Q${r.id}: ${r.question}`);
      lines.push("");
      lines.push(`- **Expected Tool:** ${r.expectedTool}`);
      lines.push(`- **Tools Called:** ${r.toolsCalled.join(", ") || "none"}`);
      lines.push(`- **Duration:** ${r.duration}ms`);
      lines.push(`- **Status:** ${r.success ? "✅ Success" : "❌ Failed"}`);
      if (r.error) {
        lines.push(`- **Error:** ${r.error}`);
      }
      lines.push("");

      // Process events (collapsed for brevity)
      if (r.processEvents.length > 0) {
        lines.push("<details>");
        lines.push("<summary>Process Events</summary>");
        lines.push("");
        for (const event of r.processEvents) {
          lines.push(`- \`${event.type}\`: ${event.content}`);
        }
        lines.push("");
        lines.push("</details>");
        lines.push("");
      }

      lines.push("**Answer:**");
      lines.push("");
      lines.push("```");
      lines.push(r.answer || "(no answer)");
      lines.push("```");
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ============================================================================
// Main Entry
// ============================================================================

runTests().catch((error) => {
  console.error("Test runner failed:", error);
  process.exit(1);
});
