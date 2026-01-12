import fs from 'fs';
import path from 'path';

export function loadPromptTemplate(filename: string): string {
  const filePath = path.join(process.cwd(), 'src', 'lib', 'prompts', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 生成智能文档分析的系统提示词（用于视觉识别）。
 * Used by: /api/quick-actions/extract
 */
export function getDataExtractPrompt(): string {
  const promptTemplate = loadPromptTemplate('data-extract.txt');
  return promptTemplate.replace(/\r\n/g, '\n');
}

/**
 * 生成报告配置意图解析的提示词。
 * Used by: /api/reports/parse-config
 */
export function getReportConfigIntentPrompt(
  year: string,
  comparisonYear: string | null,
  availableYears: string[],
  userMessage: string
): string {
  const promptTemplate = loadPromptTemplate('report-config-intent.txt');
  return promptTemplate
    .replace('{{year}}', year)
    .replace('{{comparisonYear}}', comparisonYear || '无')
    .replace('{{availableYears}}', availableYears.join('、'))
    .replace('{{userMessage}}', userMessage)
    .replace(/\r\n/g, '\n');
}
