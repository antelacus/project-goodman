export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, analysisType, question } = body;

    if (!text) {
      return NextResponse.json({ error: "No text provided for analysis" }, { status: 400 });
    }

    let prompt = "";
    let useJsonFormat = false;

    if (analysisType === "financial_analysis") {
      // 财务分析模式
      prompt = `
        你是一个专业的财务分析师AI。请分析以下财务数据并提供深入的财务分析报告。

        分析要求：
        1. 识别关键财务指标和趋势
        2. 提供财务健康状况评估
        3. 指出潜在的风险和机会
        4. 给出具体的改进建议

        财务数据：
        ---
        ${text}
        ---

        请提供结构化的分析报告，包括：
        - 财务概况
        - 关键指标分析
        - 风险评估
        - 改进建议
      `;
    } else if (analysisType === "prediction") {
      // 财务预测模式
      prompt = `
        你是一个专业的财务预测AI。基于以下历史财务数据，请提供未来3-6个月的财务预测。

        预测要求：
        1. 基于历史趋势进行合理预测
        2. 考虑季节性因素
        3. 提供预测的置信区间
        4. 说明预测的假设条件

        历史财务数据：
        ---
        ${text}
        ---

        请提供结构化的预测报告，包括：
        - 收入预测
        - 成本预测
        - 现金流预测
        - 关键假设说明
      `;
    } else if (analysisType === "chat") {
      // 对话模式
      prompt = `
        你是一个专业的财务AI助手。基于以下财务数据，回答用户的问题。

        财务数据：
        ---
        ${text}
        ---

        用户问题：${question}

        请提供准确、专业的回答，如果数据不足，请说明需要哪些额外信息。
      `;
    } else {
      // 通用分析模式
      prompt = `
        你是一个专业的财务AI分析师。请分析以下财务数据并提供全面的财务洞察。

        分析要求：
        1. 识别文档类型（资产负债表、利润表、现金流量表等）
        2. 提取关键财务数据
        3. 计算重要财务比率
        4. 提供财务健康状况评估

        财务数据：
        ---
        ${text}
        ---

        请以JSON格式返回分析结果，包含以下字段：
        - document_type: 文档类型
        - key_metrics: 关键财务指标
        - financial_ratios: 财务比率
        - health_assessment: 财务健康状况
        - recommendations: 建议
      `;
      useJsonFormat = true;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: useJsonFormat ? { type: "json_object" } : { type: "text" },
      max_tokens: 2000,
    });

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      throw new Error("AI analysis returned no result.");
    }

    // 根据分析类型返回不同格式的结果
    if (analysisType === "chat") {
      return NextResponse.json({ 
        response: result,
        type: "chat"
      });
    } else if (useJsonFormat) {
      return NextResponse.json(JSON.parse(result));
    } else {
      return NextResponse.json({ 
        analysis: result,
        type: analysisType
      });
    }

  } catch (err: unknown) {
    console.error("Financial Analysis API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to analyze financial data.", details: errorMessage },
      { status: 500 }
    );
  }
} 