/** What users see when an AI call fails (REQ §5.2). Never a stand-in for the output. */
export const AI_FAILURE_TEXT = {
  chat: 'AI 服务暂时不可用，请稍后再试',
  extraction: '数据提取失败（AI 服务不可用），未写入任何数据',
  reportSection: '分析生成失败（AI 服务不可用）',
  summarySectionsFailed: '摘要未生成：部分章节的分析生成失败',
  summaryUnavailable: '摘要未生成：AI 服务不可用',
} as const;
