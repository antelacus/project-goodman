import fs from 'fs';
import path from 'path';

export function loadPromptTemplate(filename: string): string {
  const filePath = path.join(process.cwd(), 'src', 'lib', 'prompts', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 生成智能文档分析的系统提示词（用于视觉识别）。
 * Used by: /api/tools/extract
 */
export function getDataExtractPrompt(): string {
  const promptTemplate = loadPromptTemplate('data-extract.txt');
  return promptTemplate.replace(/\r\n/g, '\n');
}
