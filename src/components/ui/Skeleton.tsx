/**
 * Skeleton Loading Components
 * v4.3: Foundation enhancement
 *
 * Provides skeleton loading states for better UX during data fetching.
 * Uses brand yellow color (bg-yellow-100) for visual consistency.
 */

import { cn } from '@/lib/utils';

/**
 * Base skeleton component with brand yellow color
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-yellow-100 rounded", className)} />
  );
}

/**
 * Text skeleton - displays multiple lines of skeleton text
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

/**
 * Session list skeleton for sidebar
 */
export function SkeletonSessionList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

/**
 * Chat message skeleton
 */
export function SkeletonMessage() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/**
 * Document list item skeleton
 */
export function SkeletonDocumentItem() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-neutral-100">
      <Skeleton className="h-10 w-10 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-5 rounded" />
    </div>
  );
}

/**
 * Document list skeleton for modals
 */
export function SkeletonDocumentList({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-neutral-100">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonDocumentItem key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
