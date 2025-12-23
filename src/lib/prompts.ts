import fs from 'fs';
import path from 'path';

// 从本地文件读取prompt模板的辅助函数
// FROM:
// function readPromptFile(filename: string): string {
//   const filePath = path.join(process.cwd(), 'src', 'lib', 'prompts', filename);
//   return fs.readFileSync(filePath, 'utf-8');
// }

export function loadPromptTemplate(filename: string): string {
  const filePath = path.join(process.cwd(), 'src', 'lib', 'prompts', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

// Deprecated usage mapping if necessary, or just update internal usage
function readPromptFile(filename: string): string {
  return loadPromptTemplate(filename);
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

// 财务分析模块 prompt
/**
 * 生成财务分析的系统提示词（使用函数调用架构）。
 * @param params.presetFunctionsList 预设函数列表
 * @param params.availableDocuments 可用文档列表
 * @param params.context 对话上下文
 * @param params.metricList 标准财务指标列表
 * @param params.businessContext 业务情况上下文（可选）
 * @returns prompt字符串
 */
export function getFinancialAnalysisPrompt(params: {
  presetFunctionsList: string;
  availableDocuments: string;
  context: string;
  metricList: string;
  businessContext?: string;
}): string {
  const { presetFunctionsList, availableDocuments, context, metricList, businessContext = '' } = params;

  const promptTemplate = readPromptFile('financial-analysis.txt');

  return promptTemplate
    .replace(/\r\n/g, '\n')
    .replace(/{PRESET_FUNCTIONS_LIST}/g, presetFunctionsList)
    .replace(/{AVAILABLE_DOCUMENTS}/g, availableDocuments)
    .replace(/{CONTEXT}/g, context)
    .replace(/{METRIC_LIST}/g, metricList)
    .replace(/{BUSINESS_CONTEXT}/g, businessContext || '暂无业务情况信息。');
}

// 合规指导模块 prompt
/**
 * 生成合规指导的系统提示词（使用混合搜索架构）。
 * @param params.retrievedRegulations 检索到的法规内容
 * @param params.uploadedDocument 用户上传的文档内容（可选）
 * @param params.businessContext 业务情况上下文（可选）
 * @returns prompt字符串
 */
export function getGuidanceChatPrompt(params: {
  retrievedRegulations: string;
  uploadedDocument?: string;
  businessContext?: string;
}): string {
  const { retrievedRegulations, uploadedDocument = '', businessContext = '' } = params;

  const promptTemplate = readPromptFile('guidance-chat.txt');

  return promptTemplate
    .replace(/\r\n/g, '\n')
    .replace(/{RETRIEVED_REGULATIONS}/g, retrievedRegulations)
    .replace(/{UPLOADED_DOCUMENT}/g, uploadedDocument)
    .replace(/{BUSINESS_CONTEXT}/g, businessContext || '暂无业务情况信息。');
}
