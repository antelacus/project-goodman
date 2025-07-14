import fs from 'fs';
import path from 'path';

// 从本地文件读取prompt模板的辅助函数
function readPromptFile(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'prompts', filename);
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    // 如果文件不存在，回退到环境变量
    console.warn(`Prompt file ${filename} not found, falling back to environment variable`);
    throw new Error(`Prompt file ${filename} not found`);
  }
}

// 智能文档分析API prompt（从本地文件读取）
/**
 * 生成智能文档分析的系统提示词。
 * @param text 需要分析的文档文本内容
 * @returns prompt字符串
 */
export function getDataExtractPrompt(text: string): string {
  // 优先从本地文件读取，如果失败则从环境变量读取
  let promptTemplate: string;
  
  try {
    promptTemplate = readPromptFile('data-extract.txt');
  } catch {
    promptTemplate = process.env.PROMPT_DATA_EXTRACT || '';
    if (!promptTemplate) {
      throw new Error('Neither prompt file nor PROMPT_DATA_EXTRACT environment variable is available');
    }
  }
  
  // 处理换行符并替换占位符
  return promptTemplate
    .replace(/\r\n/g, '\n') // 统一换行符格式
    .replace(/{TEXT}/g, text);
}

// 财务分析与预测API prompt（从本地文件读取）
/**
 * 生成财务分析与预测AI的系统提示词。
 * @param params.text 财务数据文本内容
 * @param params.question 用户问题
 * @param params.knowledgeDocNames 选中的知识型文档名称数组
 * @returns prompt字符串及格式要求
 */
export function getFinancialAnalysisPrompt(params: { text: string, question?: string, knowledgeDocNames?: string[] }): { prompt: string, useJsonFormat: boolean } {
  const { text, question = '', knowledgeDocNames = [] } = params;
  
  // 优先从本地文件读取，如果失败则从环境变量读取
  let promptTemplate: string;
  
  try {
    promptTemplate = readPromptFile('financial-analysis.txt');
  } catch {
    promptTemplate = process.env.PROMPT_FINANCIAL_ANALYSIS || '';
    if (!promptTemplate) {
      throw new Error('Neither prompt file nor PROMPT_FINANCIAL_ANALYSIS environment variable is available');
    }
  }
  
  // 构建文档列表
  const docList = knowledgeDocNames.length > 0 ? `数据库文档：${knowledgeDocNames.join('，')}` : '';
  
  // 处理换行符并替换占位符
  const prompt = promptTemplate
    .replace(/\r\n/g, '\n') // 统一换行符格式
    .replace(/{DOC_LIST}/g, docList)
    .replace(/{TEXT}/g, text)
    .replace(/{QUESTION}/g, question);
  
  return { prompt, useJsonFormat: false };
}

// 知识型对话（guidance-chat）模块 prompt（从本地文件读取）
/**
 * 生成合规性指导AI的系统提示词。
 * @param selectedKnowledgeDocNames 选中的知识型文档名称数组
 * @param selectedBusinessDocNames 选中的业务型文档名称数组
 * @returns prompt字符串
 */
export function getGuidanceChatPrompt(selectedKnowledgeDocNames: string[], selectedBusinessDocNames: string[]): string {
  // 优先从本地文件读取，如果失败则从环境变量读取
  let promptTemplate: string;
  
  try {
    promptTemplate = readPromptFile('guidance-chat.txt');
  } catch {
    promptTemplate = process.env.PROMPT_GUIDANCE_CHAT || '';
    if (!promptTemplate) {
      throw new Error('Neither prompt file nor PROMPT_GUIDANCE_CHAT environment variable is available');
    }
  }
  
  // 构建文档列表
  const knowledgeList = selectedKnowledgeDocNames.length > 0 ? `数据库文档：${selectedKnowledgeDocNames.join('，')}` : '';
  const businessList = selectedBusinessDocNames.length > 0 ? `待处理文档：${selectedBusinessDocNames.join('，')}` : '';
  
  // 处理换行符并替换占位符
  return promptTemplate
    .replace(/\r\n/g, '\n') // 统一换行符格式
    .replace(/{KNOWLEDGE_LIST}/g, knowledgeList)
    .replace(/{BUSINESS_LIST}/g, businessList);
} 