"use client";

import React, { useState, useEffect, useCallback } from "react";

interface SecurePdfPreviewProps {
  fileUrl: string;
  className?: string;
}

/**
 * Secure PDF Preview Component
 *
 * Renders PDF pages as images to prevent users from downloading the original PDF.
 * Uses server-side rendering via /api/documents/pdf-preview endpoint.
 */
export default function SecurePdfPreview({
  fileUrl,
  className = "",
}: SecurePdfPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);

  // Fetch page count on mount
  useEffect(() => {
    const fetchPageCount = async () => {
      try {
        const response = await fetch("/api/documents/pdf-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl }),
        });

        if (!response.ok) {
          throw new Error("Failed to get page count");
        }

        const data = await response.json();
        setTotalPages(data.numPages);
      } catch (err) {
        console.error("Failed to get PDF page count:", err);
        setError("无法加载 PDF 文件");
      }
    };

    fetchPageCount();
  }, [fileUrl]);

  // Fetch current page image
  useEffect(() => {
    if (totalPages === 0) return;

    const fetchPage = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `/api/documents/pdf-preview?fileUrl=${encodeURIComponent(
          fileUrl
        )}&page=${currentPage}&scale=${scale}`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load page");
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // Clean up previous URL
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }

        setImageUrl(objectUrl);
      } catch (err) {
        console.error("Failed to load PDF page:", err);
        setError(err instanceof Error ? err.message : "加载页面失败");
      } finally {
        setLoading(false);
      }
    };

    fetchPage();

    // Cleanup on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, currentPage, totalPages, scale]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(3, prev + 0.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(0.5, prev - 0.5));
  }, []);

  if (error && totalPages === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 bg-gray-100 rounded ${className}`}
      >
        <div className="text-center text-gray-500">
          <p>{error}</p>
          <p className="text-sm mt-2">请稍后重试或联系管理员</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-t border border-b-0 border-gray-300">
        {/* Page navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1 || loading}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            上一页
          </button>
          <span className="text-sm text-gray-600">
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : "加载中..."}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages || loading}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            下一页
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5 || loading}
            className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="缩小"
          >
            −
          </button>
          <span className="text-sm text-gray-600 w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 3 || loading}
            className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="放大"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Page Display */}
      <div
        className="flex-grow overflow-auto bg-gray-200 border border-gray-300 rounded-b"
        style={{ minHeight: "500px", maxHeight: "70vh" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600 mb-2"></div>
              <p className="text-gray-500 text-sm">加载页面中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-500">
              <p>{error}</p>
              <button
                onClick={() => setCurrentPage(currentPage)}
                className="mt-2 px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm text-gray-700"
              >
                重试
              </button>
            </div>
          </div>
        ) : imageUrl ? (
          <div className="flex justify-center p-4">
            <img
              src={imageUrl}
              alt={`Page ${currentPage}`}
              className="shadow-lg"
              style={{ maxWidth: "100%", height: "auto" }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
