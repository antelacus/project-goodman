export const WorkflowErrorType = {
  VALIDATION: 'VALIDATION',
  AUTH: 'AUTH',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  RETRIEVAL_EMPTY: 'RETRIEVAL_EMPTY',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  REPORT_FAILED: 'REPORT_FAILED',
  INTERNAL: 'INTERNAL',
} as const;

export type WorkflowErrorType =
  (typeof WorkflowErrorType)[keyof typeof WorkflowErrorType];

export const WORKFLOW_ERROR_MESSAGES: Record<WorkflowErrorType, string> = {
  VALIDATION: '输入验证失败',
  AUTH: '认证失败',
  FORBIDDEN: '没有访问权限',
  RATE_LIMIT: '请求过于频繁，请稍后重试',
  TIMEOUT: '请求超时，请重试',
  RETRIEVAL_EMPTY: '未找到相关数据，请尝试调整关键词或上传文档',
  EXTRACTION_FAILED: '文档提取失败，请检查文件内容后重试',
  REPORT_FAILED: '报告生成失败，请稍后重试',
  INTERNAL: '处理请求时出错，请稍后重试',
};
