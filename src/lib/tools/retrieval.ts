export const RETRIEVAL_EMPTY_DOCUMENTS_REASON =
  '未找到相关文档。你可以上传相关文档，或调整关键词/年份后重试。';

export const RETRIEVAL_EMPTY_REGULATIONS_REASON =
  '未找到相关法规。你可以尝试调整关键词或描述。';

export const RETRIEVAL_EMPTY_DATA_REASON =
  '未找到指标数据。你可以上传相关文档或调整年份。';

export const RETRIEVAL_FAILED_REASON =
  '检索暂时失败。你可以稍后重试，或换个关键词。';

export function buildMissingMetricsReason(missing: string[]): string {
  if (missing.length === 0) {
    return RETRIEVAL_EMPTY_DATA_REASON;
  }

  return `缺少必要指标：${missing.join('、')}。你可以上传相关文档或调整年份。`;
}
