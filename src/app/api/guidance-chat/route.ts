/**
 * Guidance Chat API Route
 *
 * Provides regulatory compliance guidance using hybrid search.
 * This route has been refactored to use the workflow architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { runGuidanceChatWorkflow } from "../../../lib/workflows/guidance-chat";

export const runtime = "nodejs";

interface GuidanceChatRequest {
  question: string;
  uploadedDocument?: {
    text: string;
    fileName: string;
    id?: string;
  };
  documentIds?: string[];
  regulationCategories?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GuidanceChatRequest = await request.json();
    const { question, uploadedDocument, documentIds, regulationCategories } =
      body;

    // Validate input
    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return NextResponse.json({ error: "请提供有效的问题" }, { status: 400 });
    }

    // Run workflow
    const state = await runGuidanceChatWorkflow({
      question,
      uploadedDocument,
      documentIds,
      regulationCategories,
    });

    // Return output
    return NextResponse.json(state.output);
  } catch (error: any) {
    console.error("Guidance Chat API error:", error);

    return NextResponse.json(
      {
        error: "处理请求时出错，请稍后重试",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
