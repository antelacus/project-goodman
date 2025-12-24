import React, { useState } from "react";
import { useDocumentStore, Document } from "../store/documents";
import { UploadFeedback, StructureAnalysis } from "./UploadFeedback";

interface DocumentSelectModalProps {
  open: boolean;
  onClose: () => void;
  mode: "single" | "multiple";
  categories: ("knowledge" | "business")[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  showUpload?: boolean;
  documents?: Document[];
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
}) => {
  const storeDocuments = useDocumentStore((s) => s.documents);
  const documents = customDocuments || storeDocuments;
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadAnalysis, setUploadAnalysis] = useState<StructureAnalysis | null>(null);

  if (!open) return null;

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
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.18)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}
      onClick={onClose}
    >
      <div style={{
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
        padding: 32,
        minWidth: 340,
        maxWidth: 480,
        maxHeight: "90vh",
        overflowY: "auto",
        position: "relative"
      }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>&times;</button>
        <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>选择文档</h3>
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
            {filtered(cat).length === 0 ? (
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
            <label className="block mb-2 font-medium">补充上传待处理文档（PDF 格式，小于1MB）</label>
            <div style={{ position: 'relative', display: 'inline-block' }}>
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
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </div>
            {/* Simple Help Text */}
            <div className="text-xs text-gray-500 mt-2">
              支持上传 PDF, 图片, Excel, Docx, TXT 格式。系统将自动分析文档结构。
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