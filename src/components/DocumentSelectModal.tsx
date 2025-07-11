import React, { useState } from "react";
import { useDocumentStore, Document } from "../store/documents";

interface DocumentSelectModalProps {
  open: boolean;
  onClose: () => void;
  mode: "single" | "multiple";
  categories: ("knowledge" | "business")[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  showUpload?: boolean;
}

const DocumentSelectModal: React.FC<DocumentSelectModalProps> = ({
  open,
  onClose,
  mode,
  categories,
  selectedIds,
  onSelect,
  showUpload = false,
}) => {
  const documents = useDocumentStore((s) => s.documents);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

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
    if (file.size > 1048576) {
      alert('文件大小不能超过1MB');
      return;
    }
    setUploading(true);
    try {
      // 只支持PDF
      if (!file.type.includes("pdf")) throw new Error("仅支持PDF文件");
      // 复用data-extract的processPDF逻辑（此处仅做占位，实际应抽取为util）
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: { str: string }) => item.str).join(" ") + "\n";
      }
      const newDoc: Document = {
        id: `business-${Date.now()}`,
        name: file.name,
        type: "pdf",
        docCategory: "business",
        uploadTime: new Date().toISOString(),
        status: "ready",
        size: file.size,
        summary: { summary: fullText, document_type: '', key_metrics: [], time_period: '' },
        chunks: [{ id: 'chunk-0', text: fullText, embedding: [], chunkIndex: 0 }],
      };
      useDocumentStore.getState().addDocument(newDoc);
      // 自动勾选新上传的文档
      if (mode === "single") {
        onSelect([newDoc.id]);
      } else {
        onSelect([...selectedIds, newDoc.id]);
      }
    } catch (err) {
      alert("上传失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setUploading(false);
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
        {categories.map(cat => (
          <div key={cat} className="mb-4">
            <div className="font-bold mb-2 text-gray-700">{cat === "knowledge" ? "数据库文档" : "待处理文档"}</div>
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
                accept="application/pdf"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
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