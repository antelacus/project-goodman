export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { runLandingChatWorkflow } from "../../../lib/workflows/landing-chat";

// Define request type
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type LandingChatRequest = {
  message: string;
  conversationHistory?: ChatMessage[];
};

export async function POST(req: NextRequest) {
  try {
    const body: LandingChatRequest = await req.json();
    const { message, conversationHistory = [] } = body;

    // Validate request
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Run workflow
    const state = await runLandingChatWorkflow({
      messages: conversationHistory,
      currentMessage: message,
    });

    // Return output
    return NextResponse.json(state.output);
  } catch (err: unknown) {
    console.error("Landing Chat API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to process chat message.", details: errorMessage },
      { status: 500 }
    );
  }
}
