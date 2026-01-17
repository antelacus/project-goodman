import React, { useState } from "react";
import { useDocumentStore, Document } from "@/store/documents";
import { UploadFeedback, StructureAnalysis } from "./UploadFeedback";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";
import { SkeletonDocumentList } from "@/components/ui/Skeleton";

interface DocumentSelectModalProps {
  open: boolean;
  onClose: () => void;
  mode: "single" | "multiple";
  categories: ("knowledge" | "business")[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  showUpload?: boolean;
  documents?: Document[];
  uploadAccept?: string;
  uploadHelpText?: string;
}

const DocumentSelectModal: React.FC<DocumentSelectModalProps> = ({
  open,
  onClose,
  mode,
  categories,
  selectedIds,
  onSelect,
  showUpload = false,
  documents: customDocuments,
  uploadAccept,
  uploadHelpText,
}) => {
  const storeDocuments = useDocumentStore((s) => s.documents);
  const isStoreLoading = useDocumentStore((s) => s.isLoading); // v4.3: Loading state for skeleton
  const documents = customDocuments || storeDocuments;
  const isLoading = !customDocuments && isStoreLoading; // Only show loading if using store documents
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadAnalysis, setUploadAnalysis] = useState<StructureAnalysis | null>(null);

  // Modal accessibility (focus trap, Escape key, ARIA)
  const { modalRef, handleBackdropClick, ariaProps } = useModalAccessibility({
    isOpen: open,
    onClose,
  });

  if (!open) return null;

  const resolvedUploadAccept = uploadAccept ?? ".pdf,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.txt,.md";
  const resolvedUploadHelpText = uploadHelpText
    ?? "支持上传 PDF、图片、Excel(.xlsx)、TXT、MD 格式。TXT/MD 仅用于对话上下文，不支持结构化提取。";

  // 按类型分组并筛选
  const filtered = (cat: "knowledge" | "business") =>
    documents.filter(
      (doc) =>
        doc.docCategory === cat &&
        (!search || doc.name.toLowerCase().includes(search.toLowerCase()))
    );

  const handleSelect = (id: string) => {
    if (mode === "single") {
      onSelect([id]);
      onClose();
    } else {
      if (selectedIds.includes(id)) {
        onSelect(selectedIds.filter((sid) => sid !== id));
      } else {
        onSelect([...selectedIds, id]);
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2MB limit matching the API
    if (file.size > 2 * 1024 * 1024) {
      alert('文件大小不能超过2MB');
      return;
    }

    setUploading(true);
    setUploadAnalysis(null); // Clear previous analysis

    try {
      // Convert to Base64
      const arrayBuffer = await file.arrayBuffer();
      const base64String = Buffer.from(arrayBuffer).toString('base64');

      const response = await fetch('/api/documents/upload-temp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: base64String,
          fileName: file.name,
          fileType: file.type,
          source: 'guidance-chat'  // Use guidance-chat to allow all supported file types
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }

      const result = await response.json();

      const newDoc: Document = {
        id: result.documentId,
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : 'knowledge', // Simplified type mapping
        docCategory: "business", // Uploads are always business/temp
        uploadTime: new Date().toISOString(),
        status: "ready",
        size: file.size,
        is_temp: true,
        summary: {
          summary: result.textPreview || 'Temporary document',
          document_type: 'temp_upload',
          key_metrics: [],
          time_period: ''
        },
      };

      useDocumentStore.getState().addDocument(newDoc);

      // Set analysis result if available
      if (result.structureAnalysis) {
        setUploadAnalysis(result.structureAnalysis);
      }

      // Auto-select the new document
      if (mode === "single") {
        onSelect([newDoc.id]);
      } else {
        onSelect([...selectedIds, newDoc.id]);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("上传失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setUploading(false);
      // Reset input value to allow uploading the same file again if needed
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black/[0.18] z-[1000] flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl p-8 min-w-[340px] max-w-[480px] max-h-[85dvh] overflow-y-auto relative"
        {...ariaProps}
        aria-labelledby="document-select-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none text-xl cursor-pointer hover:text-gray-600"
        >
          &times;
        </button>
        <h3 id="document-select-modal-title" className="font-bold text-lg mb-4">选择文档</h3>
        <input
          type="text"
          placeholder="搜索文档名称..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
        />

        {/* Upload Analysis Feedback */}
        {uploadAnalysis && (
          <div className="mb-4">
            <UploadFeedback
              analysis={uploadAnalysis}
              onClose={() => setUploadAnalysis(null)}
            />
          </div>
        )}

        {categories.filter(c => c === 'business').map(cat => (
          <div key={cat} className="mb-4">
            <div className="font-bold mb-2 text-gray-700">待处理文档</div>
            {/* v4.3: Show skeleton while loading */}
            {isLoading ? (
              <SkeletonDocumentList count={3} />
            ) : filtered(cat).length === 0 ? (
              <div className="text-gray-400 mb-2">暂无文档</div>
            ) : (
              <div className="space-y-2">
                {filtered(cat).map(doc => (
                  <div
                    key={doc.id}
                    className={`flex items-center px-3 py-2 rounded cursor-pointer ${selectedIds.includes(doc.id) ? "bg-gray-100" : "hover:bg-gray-50"}`}
                    onClick={() => handleSelect(doc.id)}
                  >
                    <span className="flex-1 truncate">{doc.name}</span>
                    {mode === "multiple" && (
                      <input type="checkbox" checked={selectedIds.includes(doc.id)} readOnly className="ml-2" />
                    )}
                    {mode === "single" && (
                      <input type="radio" checked={selectedIds.includes(doc.id)} readOnly className="ml-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {showUpload && (
          <div className="mb-4">
            <label className="block mb-2 font-medium">补充上传待处理文档（≤2MB）</label>
            <div className="relative inline-block">
              <button
                type="button"
                className="border border-black rounded px-4 py-2 font-medium bg-white hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
                disabled={uploading}
                onClick={() => {
                  // 触发隐藏的 file input
                  document.getElementById('doc-upload-input')?.click();
                }}
              >
                {uploading ? '上传中...' : '上传文档'}
              </button>
              <input
                id="doc-upload-input"
                type="file"
                accept={resolvedUploadAccept}
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
            {/* Simple Help Text */}
            <div className="text-xs text-gray-500 mt-2">
              {resolvedUploadHelpText}
            </div>
          </div>
        )}

        <button
          className="w-full border border-black rounded px-3 py-2 font-medium bg-white hover:bg-gray-100 transition-colors mt-2"
          onClick={() => window.open("/documents", "_blank")}
        >前往文档管理</button>
      </div>
    </div>
  );
};

export default DocumentSelectModal; 
