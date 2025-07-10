export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getDataExtractPrompt } from "../../../lib/prompts";

// Initialize OpenAI client using API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "No text provided for analysis" }, { status: 400 });
    }

    const prompt = getDataExtractPrompt(text);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      throw new Error("AI analysis returned no result.");
    }
    
    return NextResponse.json(JSON.parse(result));

  } catch (err: unknown) {
    console.error("OpenAI API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to analyze text with AI.", details: errorMessage },
      { status: 500 }
    );
  }
} 