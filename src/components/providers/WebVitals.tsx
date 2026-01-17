'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Web Vitals Reporter
 *
 * Reports Core Web Vitals metrics to console for baseline tracking.
 * - LCP (Largest Contentful Paint): ≤2.5s good
 * - FID (First Input Delay): ≤100ms good
 * - CLS (Cumulative Layout Shift): ≤0.1 good
 *
 * @see https://web.dev/vitals/
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log metrics in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[WebVitals]', metric.name, Math.round(metric.value));
    }

    // Production: Currently logging baseline data
    // Future: Can be extended to send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Only log for first page load to avoid noise
      if (metric.navigationType === 'navigate') {
        console.log('[WebVitals]', metric.name, Math.round(metric.value));
      }
    }
  });

  return null;
}
