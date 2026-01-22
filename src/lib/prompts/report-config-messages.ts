/**
 * Message templates for report configuration conversation.
 * Used by: useReportConfig hook and ChatWorkspace
 */

/**
 * Initial configuration proposal message.
 * Shown when user clicks "生成报告" from tools menu.
 */
export function getInitialConfigMessage(year: string, comparisonYear?: string): string {
  return `**财务分析报告生成工具**

此工具将基于您上传的财务报表数据，自动生成一份综合财务分析报告，包含：
• **流动性分析** - 流动比率、速动比率、现金比率等
• **偿债能力分析** - 资产负债率、利息保障倍数等
• **盈利能力分析** - 净利润率、ROE、ROA等
• **运营效率分析** - 应收账款周转率、存货周转率等
• **综合评价** - 关键发现、风险警示、改进建议

报告生成后，您可以将其保存为 **DOCX 格式** 下载留存。

---

默认配置如下：
• 分析年份: ${year}
• 对比年份: ${comparisonYear || '无'} (可选)

如需调整请告诉我，或回复"确认"开始生成。`;
}

/**
 * Configuration updated message.
 * Shown after user changes year or comparison year.
 */
export function getConfigUpdatedMessage(year: string, comparisonYear?: string): string {
  return `已更新配置：

• 分析年份: ${year}
• 对比年份: ${comparisonYear || '无'}

确认无误请回复"确认"，或继续调整。`;
}

/**
 * Comparison year removed message.
 * Shown when user requests to remove comparison year.
 */
export function getComparisonRemovedMessage(year: string): string {
  return `已移除对比年份，将只分析 ${year} 年数据。

确认无误请回复"确认"开始生成。`;
}

/**
 * Configuration cancelled message.
 * Shown when user cancels report generation.
 */
export function getCancelledMessage(): string {
  return `已取消报告生成。如需重新开始，请点击"工具 > 生成报告"。`;
}

/**
 * Year not available error message.
 * Shown when user requests a year that doesn't have data.
 */
export function getYearNotAvailableMessage(requestedYear: string, availableYears: string[]): string {
  return `抱歉，${requestedYear} 年的财务数据暂不可用。

目前可用的年份有：${availableYears.join('、')}。

请选择其中一个年份，或回复"取消"退出。`;
}

/**
 * No data available message.
 * Shown when there's no financial data in the system.
 */
export function getNoDataAvailableMessage(): string {
  return `抱歉，系统中暂无财务数据。请先上传财务报表后再生成报告。`;
}

/**
 * Unclear intent message.
 * Shown when the system cannot understand user's request.
 */
export function getUnclearIntentMessage(clarificationHint?: string): string {
  const hint = clarificationHint || '我没有理解您的意思。';
  return `${hint}

您可以：
• 回复"确认"开始生成报告
• 说明要分析的年份（如"分析2023年"）
• 说明对比年份（如"和2022年对比"）
• 回复"不要对比"移除对比年份
• 回复"取消"退出`;
}

/**
 * Generation starting message.
 * Brief acknowledgment before SSE streaming begins.
 */
export function getGenerationStartingMessage(year: string, comparisonYear?: string): string {
  const comparison = comparisonYear ? `（与${comparisonYear}年对比）` : '';
  return `好的，正在为您生成 ${year} 年度财务分析报告${comparison}...`;
}
