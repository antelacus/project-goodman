export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getLandingPagePrompt } from "../../../lib/prompts";
import { buildRoutingConfidence } from "../../../lib/confidence-scoring";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define types
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ModuleInfo = {
  name: string;
  displayName: string;
  reason: string;
  url: string;
};

type LandingChatResponse = {
  reply: string;
  suggestedModule?: ModuleInfo;
  suggestedQuestions?: string[];
  confidence: number;
};

// Module definitions
const MODULES = {
  'data-extract': {
    name: 'data-extract',
    displayName: '财务信息提取',
    url: '/data-extract',
  },
  'financial-analysis': {
    name: 'financial-analysis',
    displayName: '财务指标分析',
    url: '/financial-analysis',
  },
  'guidance-chat': {
    name: 'guidance-chat',
    displayName: '财务合规指导',
    url: '/guidance-chat',
  },
};

/**
 * Analyze the LLM response to determine if a module should be suggested
 */
function analyzeModuleRouting(reply: string, userMessage: string): {
  module?: ModuleInfo;
  confidence: number;
} {
  const lowerReply = reply.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();

  // Keywords for different modules
  const extractionKeywords = ['提取', '读取', 'pdf', 'excel', '解析', '上传', '文档分析'];
  const analysisKeywords = ['计算', '分析', '指标', '比率', 'roe', 'roa', '资产负债率', '净利率', '毛利率', '周转率'];
  const guidanceKeywords = ['税', '合规', '法规', '政策', '增值税', '企业所得税', '会计准则', '规定'];

  // Count keyword matches
  const extractionScore = extractionKeywords.filter(k =>
    lowerMessage.includes(k) || lowerReply.includes(k)
  ).length;

  const analysisScore = analysisKeywords.filter(k =>
    lowerMessage.includes(k) || lowerReply.includes(k)
  ).length;

  const guidanceScore = guidanceKeywords.filter(k =>
    lowerMessage.includes(k) || lowerReply.includes(k)
  ).length;

  // Determine which module to suggest
  const scores = [
    { module: 'data-extract', score: extractionScore },
    { module: 'financial-analysis', score: analysisScore },
    { module: 'guidance-chat', score: guidanceScore },
  ];

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const topScore = scores[0];

  // Only suggest if there's a clear winner (score >= 2)
  if (topScore.score >= 2) {
    const moduleKey = topScore.module as keyof typeof MODULES;
    const moduleInfo = MODULES[moduleKey];

    // Generate reason based on module
    let reason = '';
    switch (moduleKey) {
      case 'data-extract':
        reason = '用户需要从文档中提取信息';
        break;
      case 'financial-analysis':
        reason = '用户需要计算财务指标';
        break;
      case 'guidance-chat':
        reason = '用户需要税务或合规指导';
        break;
    }

    // Calculate confidence (normalized score, max 5 keywords)
    const confidence = Math.min(topScore.score / 5, 1);

    return {
      module: {
        ...moduleInfo,
        reason,
      },
      confidence,
    };
  }

  return { confidence: 0 };
}

/**
 * Generate suggested follow-up questions based on context
 */
function generateSuggestedQuestions(
  reply: string,
  suggestedModule?: ModuleInfo
): string[] {
  const suggestions: string[] = [];

  if (suggestedModule) {
    switch (suggestedModule.name) {
      case 'data-extract':
        suggestions.push('我该如何上传文档？');
        suggestions.push('支持哪些文档格式？');
        break;
      case 'financial-analysis':
        suggestions.push('可以计算哪些财务指标？');
        suggestions.push('需要上传什么类型的文档？');
        break;
      case 'guidance-chat':
        suggestions.push('你可以回答哪些税务问题？');
        suggestions.push('有哪些会计准则可以查询？');
        break;
    }
  } else {
    // General questions when no module is suggested
    suggestions.push('可以帮我提取财务报表数据吗？');
    suggestions.push('我想计算一些财务指标');
    suggestions.push('我有税务合规方面的问题');
  }

  return suggestions;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      conversationHistory = []
    }: {
      message: string;
      conversationHistory?: ChatMessage[];
    } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build prompt with conversation history
    const systemPrompt = getLandingPagePrompt(conversationHistory, message);

    // Call OpenAI API for conversational response
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "抱歉，我无法回答您的问题。";

    // Analyze the response and user message to determine routing
    const { module, confidence: routingConfidence } = analyzeModuleRouting(reply, message);

    // Build confidence score using the confidence-scoring library
    const confidenceScore = buildRoutingConfidence({
      intentClarity: routingConfidence, // How clear is the routing intent?
      moduleMatchScore: module ? 1.0 : 0.0,  // Did we identify a module?
      contextCompleteness: conversationHistory.length > 0 ? 0.8 : 0.6, // More context = higher confidence
    });

    // Generate suggested questions
    const suggestedQuestions = generateSuggestedQuestions(reply, module);

    const response: LandingChatResponse = {
      reply,
      suggestedModule: module,
      suggestedQuestions,
      confidence: confidenceScore.overall,
    };

    return NextResponse.json(response);

  } catch (err: unknown) {
    console.error("Landing Chat API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to process chat message.", details: errorMessage },
      { status: 500 }
    );
  }
}
