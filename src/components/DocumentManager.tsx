import React, { useState } from "react";
import { useDocumentStore, Document } from "../store/documents";

interface DocumentManagerProps {
  selectedIds?: string[];
  showCategory?: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ selectedIds = [], showCategory = true }) => {
  const documents = useDocumentStore((s) => s.documents);
  const removeDocument = useDocumentStore((s) => s.removeDocument);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  // 按类型分组
  const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    (acc[doc.docCategory] = acc[doc.docCategory] || []).push(doc);
    return acc;
  }, {});

  const handleDelete = async (id: string) => {
    removeDocument(id);
    setSelected((prev) => prev.filter((sid) => sid !== id));
    setDeleteTarget(null);
  };

  const handleBatchDelete = async () => {
    selected.forEach(id => removeDocument(id));
    setSelected([]);
    setBatchDeleteOpen(false);
  };

  const renderDocCard = (doc: Document) => (
    <div
      key={doc.id}
      className={`flex items-center bg-white rounded-lg shadow-sm px-4 py-3 w-full ${selected.includes(doc.id) ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
      onClick={() => setPreviewDoc(doc)}
      tabIndex={0}
      aria-label={doc.name}
    >
      <div className="flex-shrink-0 mr-3">
        <span className="inline-block align-middle">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#F3F4F6"/><path d="M7 7h10v10H7V7z" fill="#A3A3A3"/></svg>
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-lg truncate">{doc.name}</div>
        <div className="text-xs text-gray-500 mt-1">类型: {doc.docCategory === 'knowledge' ? '知识型文档' : '业务型文档'} &nbsp; • &nbsp; {Math.round((doc.size || 0) / 1024)}KB</div>
        {doc.summary?.time_period && (
          <div className="text-xs text-gray-500 mt-1">期别: {doc.summary.time_period}</div>
        )}
      </div>
      <button
        className="ml-4 px-3 py-1 bg-gray-100 text-black rounded hover:bg-gray-200 transition-colors text-sm font-medium focus:outline-none border-0 shadow-none underline-none"
        style={{textDecoration: 'none'}}
        onClick={e => { e.stopPropagation(); setPreviewDoc(doc); }}
      >预览</button>
    </div>
  );

  return (
    <div>
      {showCategory && (
        <>
          <div className="font-bold text-gray-700 mb-2">业务型文档 ({grouped["business"]?.length || 0})</div>
          {grouped["business"]?.length === 0 ? (
            <div className="text-gray-400 mb-4">暂无文档</div>
          ) : (
            <div className="space-y-4 mb-6">
              {grouped["business"]?.map(renderDocCard)}
            </div>
          )}
          <div className="font-bold text-gray-700 mb-2">知识型文档 ({grouped["knowledge"]?.length || 0})</div>
          <div className="space-y-4">
            {grouped["knowledge"]?.map(renderDocCard)}
          </div>
        </>
      )}
      {!showCategory && (
        <div className="space-y-4">
          {documents.map(renderDocCard)}
        </div>
      )}
      {/* 预览弹窗 */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative flex flex-col" style={{ maxHeight: '85vh' }}>
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl z-10"
              onClick={() => setPreviewDoc(null)}
              aria-label="关闭"
            >×</button>
            <h3 className="text-xl font-bold mb-3 text-gray-800 flex-shrink-0">{previewDoc.name}</h3>
            {previewDoc.summary && (
              <div className="mb-4 text-sm text-gray-700 border-b pb-3 flex-shrink-0">
                <p><strong>类型:</strong> {previewDoc.summary.document_type}</p>
                <p><strong>期间:</strong> {previewDoc.summary.time_period}</p>
                <p><strong>关键指标:</strong> {previewDoc.summary.key_metrics?.join('，')}</p>
                <p className="mt-2"><strong>摘要:</strong> {previewDoc.summary.summary}</p>
              </div>
            )}
            <div className="mt-2 flex-grow overflow-y-auto">
              <p className="text-sm text-gray-600 mb-2 font-semibold">完整内容预览：</p>
              <div className="bg-gray-50 rounded p-4 text-sm whitespace-pre-wrap">
                {previewDoc.chunks && previewDoc.chunks.length > 0
                  ? previewDoc.chunks.map(chunk => chunk.text).join('\n\n')
                  : "无内容可预览。"}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 单个删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full relative">
            <h4 className="text-lg font-bold mb-4">确认删除</h4>
            <p className="mb-4 text-gray-700">确定要删除文档 <span className="font-semibold">{deleteTarget.name}</span> 吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600" onClick={() => handleDelete(deleteTarget.id)}>删除</button>
            </div>
          </div>
        </div>
      )}
      {/* 批量删除确认弹窗 */}
      {batchDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full relative">
            <h4 className="text-lg font-bold mb-4">批量删除</h4>
            <p className="mb-4 text-gray-700">确定要删除选中的 {selected.length} 个文档吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => setBatchDeleteOpen(false)}>取消</button>
              <button className="px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600" onClick={handleBatchDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager; 