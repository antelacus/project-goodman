import type { ReportMetric } from '@/types/report';
import { formatMetricValue } from '@/lib/workflows/report/constants';

export function formatReportMetricValue(metric: ReportMetric): string {
  if (metric.formatted) return metric.formatted;
  return formatMetricValue(metric.toolName, metric.value);
}

export function formatReportMetricPreviousValue(metric: ReportMetric): string {
  if (metric.previousValue === undefined || metric.previousValue === null) {
    return '—';
  }
  return formatMetricValue(metric.toolName, metric.previousValue);
}
