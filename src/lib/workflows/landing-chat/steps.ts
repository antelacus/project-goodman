/**
 * Landing Chat Workflow Steps
 *
 * This file contains step functions for the landing chat workflow.
 * Each step is a pure function: (state) => Promise<state>
 */

import OpenAI from "openai";
import { getLandingPagePrompt } from "../../prompts";
import { buildRoutingConfidence } from "../../confidence-scoring";
import type { LandingChatState } from "../../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Constants
// ============================================================================

// All capabilities are now unified under /chat
// Module names are kept for intent analysis but all route to unified chat
const MODULES = {
  "data-extract": {
    name: "data-extract",
    displayName: "财务信息提取",
    url: "/chat",
  },
  "financial-analysis": {
    name: "financial-analysis",
    displayName: "财务指标分析",
    url: "/chat",
  },
  "guidance-chat": {
    name: "guidance-chat",
    displayName: "财务合规指导",
    url: "/chat",
  },
} as const;

type ModuleKey = keyof typeof MODULES;

// Keyword mappings for module routing
const MODULE_KEYWORDS = {
  extraction: [
    "提取",
    "读取",
    "pdf",
    "excel",
    "解析",
    "上传",
    "文档分析",
  ],
  analysis: [
    "计算",
    "分析",
    "指标",
    "比率",
    "roe",
    "roa",
    "资产负债率",
    "净利率",
    "毛利率",
    "周转率",
  ],
  guidance: [
    "税",
    "合规",
    "法规",
    "政策",
    "增值税",
    "企业所得税",
    "会计准则",
    "规定",
  ],
};

// ============================================================================
// Step Functions
// ============================================================================

/**
 * Step 1: Generate reply using LLM
 *
 * Calls OpenAI to generate a conversational response based on
 * the user's message and conversation history.
 */
export async function generateReply(
  state: LandingChatState
): Promise<LandingChatState> {
  const { messages, currentMessage } = state.input;

  // Build prompt with conversation history
  const systemPrompt = getLandingPagePrompt(messages, currentMessage);

  // Call OpenAI API for conversational response
  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.slice(-5).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: currentMessage },
    ],
    max_completion_tokens: 1000,
  });

  const replyContent =
    completion.choices[0]?.message?.content ||
    "抱歉，我无法回答您的问题。";

  return {
    ...state,
    reply: {
      content: replyContent,
      conversationHistory: [
        ...messages,
        { role: "user", content: currentMessage },
        { role: "assistant", content: replyContent },
      ],
    },
    meta: {
      ...state.meta,
      currentStep: "generate_reply",
    },
  };
}

/**
 * Step 2: Analyze intent and route to module
 *
 * Analyzes the user message and LLM reply to determine
 * if a specific module should be suggested.
 */
export async function analyzeRouting(
  state: LandingChatState
): Promise<LandingChatState> {
  const { currentMessage } = state.input;
  const { content: replyContent } = state.reply;

  const lowerReply = replyContent.toLowerCase();
  const lowerMessage = currentMessage.toLowerCase();

  // Count keyword matches for each module
  const extractionScore = MODULE_KEYWORDS.extraction.filter(
    (k) => lowerMessage.includes(k) || lowerReply.includes(k)
  ).length;

  const analysisScore = MODULE_KEYWORDS.analysis.filter(
    (k) => lowerMessage.includes(k) || lowerReply.includes(k)
  ).length;

  const guidanceScore = MODULE_KEYWORDS.guidance.filter(
    (k) => lowerMessage.includes(k) || lowerReply.includes(k)
  ).length;

  // Determine which module to suggest
  const scores = [
    { module: "data-extract" as ModuleKey, score: extractionScore },
    { module: "financial-analysis" as ModuleKey, score: analysisScore },
    { module: "guidance-chat" as ModuleKey, score: guidanceScore },
  ];

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const topScore = scores[0];
  let suggestedModule: LandingChatState["routing"]["suggestedModule"];
  let routingConfidence = 0;

  // Only suggest if there's a clear winner (score >= 2)
  if (topScore.score >= 2) {
    const moduleInfo = MODULES[topScore.module];

    // Generate reason based on module
    let reason = "";
    switch (topScore.module) {
      case "data-extract":
        reason = "用户需要从文档中提取信息";
        break;
      case "financial-analysis":
        reason = "用户需要计算财务指标";
        break;
      case "guidance-chat":
        reason = "用户需要税务或合规指导";
        break;
    }

    // Calculate routing confidence (normalized score, max 5 keywords)
    routingConfidence = Math.min(topScore.score / 5, 1);

    suggestedModule = {
      ...moduleInfo,
      reason,
    };
  }

  return {
    ...state,
    routing: {
      intentAnalysis: {
        extractionKeywords: extractionScore,
        analysisKeywords: analysisScore,
        guidanceKeywords: guidanceScore,
      },
      suggestedModule,
      confidence: routingConfidence,
    },
    meta: {
      ...state.meta,
      currentStep: "analyze_routing",
    },
  };
}

/**
 * Step 3: Generate suggested follow-up questions
 *
 * Creates contextual suggestions based on the routing result
 * to help guide the user's next actions.
 */
export async function generateSuggestions(
  state: LandingChatState
): Promise<LandingChatState> {
  const { suggestedModule } = state.routing;

  const questions: string[] = [];

  if (suggestedModule) {
    switch (suggestedModule.name) {
      case "data-extract":
        questions.push("我该如何上传文档？");
        questions.push("支持哪些文档格式？");
        break;
      case "financial-analysis":
        questions.push("可以计算哪些财务指标？");
        questions.push("需要上传什么类型的文档？");
        break;
      case "guidance-chat":
        questions.push("你可以回答哪些税务问题？");
        questions.push("有哪些会计准则可以查询？");
        break;
    }
  } else {
    // General questions when no module is suggested
    questions.push("可以帮我提取财务报表数据吗？");
    questions.push("我想计算一些财务指标");
    questions.push("我有税务合规方面的问题");
  }

  return {
    ...state,
    suggestions: {
      questions,
    },
    meta: {
      ...state.meta,
      currentStep: "generate_suggestions",
    },
  };
}

/**
 * Step 4: Generate final output response
 *
 * Builds the final output structure with confidence scoring
 * using the confidence-scoring library.
 */
export async function generateResponse(
  state: LandingChatState
): Promise<LandingChatState> {
  const { messages } = state.input;
  const { content: replyContent } = state.reply;
  const { suggestedModule, confidence: routingConfidence } = state.routing;
  const { questions } = state.suggestions;

  // Build confidence score using the confidence-scoring library
  const confidenceScore = buildRoutingConfidence({
    intentClarity: routingConfidence,
    moduleMatchScore: suggestedModule ? 1.0 : 0.0,
    contextCompleteness: messages.length > 0 ? 0.8 : 0.6,
  });

  return {
    ...state,
    output: {
      reply: replyContent,
      suggestedModule,
      suggestedQuestions: questions,
      confidence: confidenceScore.overall,
    },
    meta: {
      ...state.meta,
      currentStep: "generate_response",
      endTime: Date.now(),
    },
  };
}
