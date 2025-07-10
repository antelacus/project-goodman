// 智能文档分析API prompt（结构化、易维护版）
/**
 * 生成智能文档分析的系统提示词。
 * @param text 需要分析的文档文本内容
 * @returns prompt字符串
 */
export function getDataExtractPrompt(text: string): string {
  return `你是一名世界级的财务分析AI助手，任务是分析下方文档内容并提取所有关键财务信息。请严格遵循以下要求：

1. 自动识别文档类型（如发票、合同、收据等）。
2. 提取所有与财务相关的字段。
3. 结果必须以“扁平化”的JSON对象返回，不允许嵌套对象。
4. JSON的键名需与文档主要语言一致：
   - 中文文档请用中文键名（如“发票号码”）。
   - 英文文档请用英文蛇形命名（如“invoice_number”）。
5. 未找到的字段不应出现在结果中。
6. 常见字段示例：document_type, invoice_number, invoice_date, due_date, total_amount, currency, vendor_name, customer_name。

文档内容：
---
${text}
---
`;
}

// 财务分析与预测API prompt（结构化、易维护版，分析与预测合并）
/**
 * 生成财务分析与预测AI的系统提示词。
 * @param params.text 财务数据文本内容
 * @param params.question 用户问题
 * @param params.knowledgeDocNames 选中的知识型文档名称数组
 * @returns prompt字符串及格式要求
 */
export function getFinancialAnalysisApiPrompt(params: { text: string, question?: string, knowledgeDocNames?: string[] }): { prompt: string, useJsonFormat: boolean } {
  const { text, question = '', knowledgeDocNames = [] } = params;
  const docList = knowledgeDocNames.length > 0 ? `知识型文档：${knowledgeDocNames.join('，')}` : '';
  const prompt = `你是专业的财务分析与预测AI助手，必须严格基于输入的知识型文档内容为用户提供专业、准确的财务分析、预测和建议。请严格遵循以下要求：

1. 充分引用输入的知识型文档内容，确保所有结论和建议均有据可依。
2. 如涉及数学计算，必须明确列出所有数学计算过程，并用LaTeX公式（$...$ 或 $$...$$）包裹。
3. 自动判断用户问题属于分析、预测或其它财务相关类型，灵活调整分析角度。
4. 如信息不足，请明确指出需要哪些额外信息。

${docList}

财务数据：
---
${text}
---

用户问题：${question}

请以专业、结构化的方式作答。`;
  return { prompt, useJsonFormat: false };
}

// 知识型对话（guidance-chat）模块 prompt（结构化、易维护版）
/**
 * 生成合规性指导AI的系统提示词。
 * @param selectedKnowledgeDocNames 选中的知识型文档名称数组
 * @param selectedBusinessDocNames 选中的业务型文档名称数组
 * @returns prompt字符串
 */
export function getGuidanceChatPrompt(selectedKnowledgeDocNames: string[], selectedBusinessDocNames: string[]): string {
  // 拼接文档列表
  const knowledgeList = selectedKnowledgeDocNames.length > 0 ? `知识型文档：${selectedKnowledgeDocNames.join('，')}` : '';
  const businessList = selectedBusinessDocNames.length > 0 ? `业务型文档：${selectedBusinessDocNames.join('，')}` : '';

  // 结构化系统提示词
  return `你是财务合规性AI助手，分析对象为财务相关文档。请严格遵循以下要求：

1. 必须充分引用输入的知识型文档内容，确保所有合规建议均有据可依。
2. 如涉及数学计算，必须明确列出所有数学计算过程，并用LaTeX公式（$...$ 或 $$...$$）包裹。
3. 结合业务型文档的具体情况，提供针对性的合规建议。
4. 明确指出可能存在的合规风险，并给出具体改进建议。
5. 如信息不足，请明确指出需要哪些额外信息。

${knowledgeList}
${businessList}
`;
} 