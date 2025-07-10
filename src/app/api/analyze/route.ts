export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

    const prompt = `
      You are a world-class financial analyst AI. Your task is to analyze the following document text and extract key financial information.
      The document could be an invoice, a contract, a receipt, or any other financial document.
      Please identify the document type and extract all relevant fields.

      Return the result as a single, flat JSON object. Do not nest objects.
      
      **Generate the keys for the JSON object in the same primary language as the document's content.**
      For example, if the document is in Chinese, use Chinese keys like '发票号码'.
      If the document is in English, use English keys like 'invoice_number' (formatted in snake_case).
      
      If a value is not found, the key should not be included in the response.
      
      Example fields (in English) include: document_type, invoice_number, invoice_date, due_date, total_amount, currency, vendor_name, customer_name.

      Analyze the following text:
      ---
      ${text}
      ---
    `;

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