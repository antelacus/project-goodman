'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError] Critical error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">出现严重错误</h2>
          <p className="text-gray-600 mb-4">
            应用遇到了无法恢复的错误。请刷新页面重试。
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 rounded transition-colors"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
