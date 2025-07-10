export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getFinancialAnalysisApiPrompt } from "../../../lib/prompts";

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

    const { prompt, useJsonFormat } = getFinancialAnalysisApiPrompt({ text, question });

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