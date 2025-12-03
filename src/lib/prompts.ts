import fs from 'fs';
import path from 'path';

// 从本地文件读取prompt模板的辅助函数
function readPromptFile(filename: string): string {
  const filePath = path.join(process.cwd(), 'src', 'lib', 'prompts', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

// 智能文档分析API prompt
/**
 * 生成智能文档分析的系统提示词（用于视觉识别）。
 * @returns prompt字符串
 */
export function getDataExtractPrompt(): string {
  const promptTemplate = readPromptFile('data-extract.txt');

  return promptTemplate.replace(/\r\n/g, '\n');
}

// 财务分析与预测API prompt
/**
 * 生成财务分析与预测AI的系统提示词。
 * @param params.text 财务数据文本内容
 * @param params.question 用户问题
 * @param params.knowledgeDocNames 选中的知识型文档名称数组
 * @returns prompt字符串及格式要求
 */
export function getFinancialAnalysisPrompt(params: { text: string, question?: string, knowledgeDocNames?: string[] }): { prompt: string, useJsonFormat: boolean } {
  const { text, question = '', knowledgeDocNames = [] } = params;

  const promptTemplate = readPromptFile('financial-analysis.txt');

  const docList = knowledgeDocNames.length > 0 ? `数据库文档：${knowledgeDocNames.join('，')}` : '';

  const prompt = promptTemplate
    .replace(/\r\n/g, '\n')
    .replace(/{DOC_LIST}/g, docList)
    .replace(/{TEXT}/g, text)
    .replace(/{QUESTION}/g, question);

  return { prompt, useJsonFormat: false };
}

// 知识型对话（guidance-chat）模块 prompt
/**
 * 生成合规性指导AI的系统提示词。
 * @param selectedKnowledgeDocNames 选中的知识型文档名称数组
 * @param selectedBusinessDocNames 选中的业务型文档名称数组
 * @returns prompt字符串
 */
export function getGuidanceChatPrompt(selectedKnowledgeDocNames: string[], selectedBusinessDocNames: string[]): string {
  const promptTemplate = readPromptFile('guidance-chat.txt');

  const knowledgeList = selectedKnowledgeDocNames.length > 0 ? `数据库文档：${selectedKnowledgeDocNames.join('，')}` : '';
  const businessList = selectedBusinessDocNames.length > 0 ? `待处理文档：${selectedBusinessDocNames.join('，')}` : '';

  return promptTemplate
    .replace(/\r\n/g, '\n')
    .replace(/{KNOWLEDGE_LIST}/g, knowledgeList)
    .replace(/{BUSINESS_LIST}/g, businessList);
}

// 着陆页模块 prompt
/**
 * 生成着陆页AI路由助手的系统提示词。
 * @param conversationHistory 对话历史数组
 * @param userMessage 当前用户消息
 * @returns prompt字符串
 */
export function getLandingPagePrompt(conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>, userMessage: string): string {
  const promptTemplate = readPromptFile('landing-page.txt');

  const historyText = conversationHistory.length > 0
    ? conversationHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')
    : '(No previous conversation)';

  return promptTemplate
    .replace(/\r\n/g, '\n')
    .replace(/{CONVERSATION_HISTORY}/g, historyText)
    .replace(/{USER_MESSAGE}/g, userMessage);
}

// 财务分析v2模块 prompt
/**
 * 生成财务分析v2的系统提示词（使用函数调用架构）。
 * @param params.presetFunctionsList 预设函数列表
 * @param params.availableDocuments 可用文档列表
 * @param params.context 对话上下文
 * @returns prompt字符串
 */
export function getFinancialAnalysisV2Prompt(params: {
  presetFunctionsList: string;
  availableDocuments: string;
  context: string;
  metricList: string;
}): string {
  const { presetFunctionsList, availableDocuments, context, metricList } = params;

  const promptTemplate = readPromptFile('financial-analysis-v2.txt');

  return promptTemplate
    .replace(/\r\n/g, '\n')
    .replace(/{PRESET_FUNCTIONS_LIST}/g, presetFunctionsList)
    .replace(/{AVAILABLE_DOCUMENTS}/g, availableDocuments)
    .replace(/{CONTEXT}/g, context)
    .replace(/{METRIC_LIST}/g, metricList);
}

// 合规指导v2模块 prompt
/**
 * 生成合规指导v2的系统提示词（使用混合搜索架构）。
 * @param params.retrievedRegulations 检索到的法规内容
 * @param params.uploadedDocument 用户上传的文档内容（可选）
 * @returns prompt字符串
 */
export function getGuidanceChatV2Prompt(params: {
  retrievedRegulations: string;
  uploadedDocument?: string;
}): string {
  const { retrievedRegulations, uploadedDocument = '' } = params;

  const promptTemplate = readPromptFile('guidance-chat-v2.txt');

  return promptTemplate
    .replace(/\r\n/g, '\n')
    .replace(/{RETRIEVED_REGULATIONS}/g, retrievedRegulations)
    .replace(/{UPLOADED_DOCUMENT}/g, uploadedDocument);
}
