"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useDocumentStore, Document } from "@/store/documents";
import { PageContainer, PageTitle } from "@/components/layout";
import { useAdminAuth } from "@/components/admin";
import { useDropzone } from "react-dropzone";
import {
  DOC_TYPE_OPTIONS,
  PERIOD_OPTIONS as PERIOD_OPTIONS_DATA,
  formatDocType,
  formatPeriod,
  requiresYearPeriod,
  isFinancialStatement,
  isUploadable,
  PDF_ONLY_TYPES,
} from "@/lib/documents";
import { updateDocumentMetadata } from "@/lib/documents/update-document-metadata";
import {
  isImage,
  isPdf,
  isExcel,
} from "@/lib/documents";
import { ReportsList } from "@/components/documents";

// Generate year options (last 20 years)
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => `${CURRENT_YEAR - i}`);

// Period options for dropdown (from constants)
const PERIOD_SELECT_OPTIONS = PERIOD_OPTIONS_DATA;

// Admin supported formats for database upload (no size limit for admin)
const ADMIN_SUPPORTED_FORMATS = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/markdown": [".md"],
};

function EditableCell({
  value,
  options,
  editable,
  onChange,
  placeholder
}: {
  value: string;
  options: string[];
  editable: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);
  React.useEffect(() => {
    if (options.includes(value) && value !== placeholder) setHasSelected(true);
  }, [value, options, placeholder]);
  const showPlaceholder = !hasSelected;

  if (!editable) return <span>{value || "-"}</span>;

  return (
    <div className="relative">
      <button
        className={`px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50 min-w-[80px] ${showPlaceholder ? "text-gray-400" : "text-black"}`}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
        type="button"
      >
        {showPlaceholder ? (placeholder || "请选择") : value}
        <span className="ml-1">▼</span>
      </button>
      {open && (
        <div className="absolute z-10 bg-white border rounded shadow mt-1 w-32 max-h-48 overflow-auto">
          {options.map((opt) => (
            <div
              key={opt}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => {
                onChange(opt);
                setOpen(false);
                setHasSelected(true);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableName({
  value,
  editable,
  onChange,
}: {
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
}) {
  // 拆分文件名和扩展名
  const match = value.match(/^(.*?)(\.[^.]+)?$/);
  const baseName = match ? match[1] : value;
  const ext = match && match[2] ? match[2] : "";
  const [input, setInput] = useState(baseName);
  React.useEffect(() => setInput(baseName), [baseName]);
  React.useEffect(() => { if (editable) setInput(baseName); }, [editable, baseName]);

  if (!editable) return <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[20rem]">{value}</span>;

  return (
    <div className="flex items-center">
      <input
        className="border px-2 py-1 rounded text-sm focus:outline-none focus:ring w-40"
        value={input}
        autoFocus
        onChange={e => setInput(e.target.value)}
        onBlur={() => {
          if ((input + ext) !== value) onChange(input + ext);
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            if ((input + ext) !== value) onChange(input + ext);
          }
        }}
      />
      {ext && <span className="ml-1 text-gray-500 select-none">{ext}</span>}
    </div>
  );
}

export default function DocumentsPage() {
  const documents = useDocumentStore((s) => s.documents);
  const updateDocument = useDocumentStore((s) => s.updateDocument);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);
  const knowledgeDocs = documents.filter((d) => d.docCategory === "knowledge");
  const businessDocs = documents.filter((d) => d.docCategory === "business");

  // Admin Auth
  const { isAuthenticated, logout, modal } = useAdminAuth();

  // Upload State
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'unsupported'>('idle');
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>('balance_sheet');
  const [uploadYear, setUploadYear] = useState<string>(new Date().getFullYear().toString());
  const [uploadPeriod, setUploadPeriod] = useState<string>('Q4');
  const [columnMapping, setColumnMapping] = useState({
    name: '',
    periodEnd: '',
    periodStart: ''
  });

  // 选择状态
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string[]>([]);
  // 预览弹窗
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch signed URL when preview opens
  useEffect(() => {
    if (previewOpen && previewDoc?.fileUrl) {
      setPreviewLoading(true);
      setPreviewSignedUrl(null);
      fetch(`/api/documents/preview-url?fileUrl=${encodeURIComponent(previewDoc.fileUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (data.signedUrl) {
            setPreviewSignedUrl(data.signedUrl);
          }
        })
        .catch(err => console.error('Failed to get preview URL:', err))
        .finally(() => setPreviewLoading(false));
    } else {
      setPreviewSignedUrl(null);
    }
  }, [previewOpen, previewDoc?.fileUrl]);

  // 全选
  const allKnowledgeSelected = knowledgeDocs.length > 0 && selectedKnowledge.length === knowledgeDocs.length;
  const allBusinessSelected = businessDocs.length > 0 && selectedBusiness.length === businessDocs.length;

  // 只允许同一类文档多选
  const handleSelect = (id: string, type: "knowledge" | "business") => {
    if (type === "knowledge") {
      setSelectedBusiness([]);
      setSelectedKnowledge((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedKnowledge([]);
      setSelectedBusiness((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    }
  };
  const handleSelectAll = (type: "knowledge" | "business") => {
    if (type === "knowledge") {
      setSelectedBusiness([]);
      setSelectedKnowledge(allKnowledgeSelected ? [] : knowledgeDocs.map(d => d.id));
    } else {
      setSelectedKnowledge([]);
      setSelectedBusiness(allBusinessSelected ? [] : businessDocs.map(d => d.id));
    }
  };

  // 编辑属性 - 使用 PATCH API
  const handleEdit = async (id: string, field: "docType" | "period" | "year" | "name", value: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;

    // Build updates object based on field
    const updates: Record<string, string | null> = {};
    if (field === "docType") {
      updates.doc_type = value || null;
    } else if (field === "period") {
      updates.period = value || null;
    } else if (field === "year") {
      updates.year = value || null;
    } else if (field === "name") {
      updates.name = value;
    }

    try {
      const response = await updateDocumentMetadata(id, updates);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失败');
      }

      // Update local state
      if (field === "docType") {
        updateDocument(id, { docType: value || null });
      } else if (field === "period") {
        updateDocument(id, { period: value || null });
      } else if (field === "year") {
        updateDocument(id, { year: value || null });
      } else if (field === "name") {
        updateDocument(id, { name: value });
      }
    } catch (err) {
      console.error('Update error:', err);
      alert(`更新失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // 删除文档
  const handleDelete = async (type: "knowledge" | "business") => {
    const selected = type === "knowledge" ? selectedKnowledge : selectedBusiness;
    if (selected.length === 0) return;

    if (!confirm(`确定要删除选中的 ${selected.length} 个文档吗？`)) return;

    for (const id of selected) {
      await deleteDocument(id);
    }

    if (type === "knowledge") setSelectedKnowledge([]);
    else setSelectedBusiness([]);
  };

  // Upload Logic
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  const uploadToDatabase = useCallback(async (file: File) => {
    try {
      // Check if document type is uploadable
      if (!isUploadable(documentType)) {
        setUploadStatus('error');
        alert('此文档类型暂不支持上传');
        return;
      }

      // Check PDF-only restriction
      const fileExt = file.name.toLowerCase().split('.').pop();
      if (PDF_ONLY_TYPES.includes(documentType) && fileExt !== 'pdf') {
        setUploadStatus('unsupported');
        alert('此文档类型仅支持 PDF 格式');
        return;
      }

      const base64Data = await convertToBase64(file);
      const adminPassword = prompt('请输入管理员密码以上传到数据库：');
      if (!adminPassword) {
        setUploadStatus('error');
        alert('需要管理员密码才能上传到数据库');
        return;
      }

      // Determine if year/period should be sent
      const needsYearPeriod = requiresYearPeriod(documentType);
      // Column mapping only for structured financial statements
      const needsColumnMapping = isFinancialStatement(documentType);

      const response = await fetch('/api/admin/upload-database-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: base64Data,
          fileName: file.name,
          documentType,
          year: needsYearPeriod ? uploadYear : undefined,
          period: needsYearPeriod ? uploadPeriod : undefined,
          columnMapping: needsColumnMapping ? columnMapping : undefined,
          adminPassword,
          metadata: {
            size: file.size,
            uploadTime: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '上传失败');
      }

      const result = await response.json();
      setUploadStatus('success');
      alert(`文档已成功上传到数据库！\n文档ID: ${result.documentId}\n处理时间: ${result.processingTime}ms`);
      // Refresh documents list logic would go here if not using realtime/optimistic updates
      // For now, we rely on the user refreshing or the store updating if we added that logic
      window.location.reload();
    } catch (err: unknown) {
      setUploadStatus('error');
      console.error('Database Upload Error:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      alert(`数据库上传失败: ${errorMessage}`);
    }
  }, [documentType, uploadYear, uploadPeriod, columnMapping]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // No size limit for admin database uploads
    setUploadStatus('uploading');
    setCurrentFileName(file.name);

    await uploadToDatabase(file);
  }, [uploadToDatabase]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ADMIN_SUPPORTED_FORMATS,
    maxFiles: 1,
    // No maxSize for admin uploads
    onDropRejected: () => {
      setUploadStatus('unsupported');
    }
  });

  const getUploadStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading': return '上传中...';
      case 'unsupported': return '文件格式不支持';
      case 'success': return '上传成功';
      case 'error': return '上传失败';
      default: return '点击或拖拽上传文件到数据库';
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success': return 'text-yellow-700';
      case 'error':
      case 'unsupported': return 'text-red-600';
      case 'uploading': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  useEffect(() => {
    if (uploadStatus !== 'idle' && uploadStatus !== 'uploading') {
      const timer = setTimeout(() => setUploadStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);


  // 属性行下拉编辑（直接在表头显示）
  const renderHeader = (type: "knowledge" | "business") => {
    const selected = type === "knowledge" ? selectedKnowledge : selectedBusiness;
    const docs = type === "knowledge" ? knowledgeDocs : businessDocs;
    const allSelected = type === "knowledge" ? allKnowledgeSelected : allBusinessSelected;
    const handleTypeChange = (v: string) => selected.forEach(id => handleEdit(id, "docType", v));
    const handleYearChange = (v: string) => selected.forEach(id => handleEdit(id, "year", v));
    const handlePeriodChange = (v: string) => selected.forEach(id => handleEdit(id, "period", v));
    const firstDoc = docs.find(d => selected.includes(d.id));

    return (
      <div className="flex font-semibold border-b border-gray-200 pb-2 text-gray-700 items-center text-sm">
        {/* 左侧固定：勾选框+文档名 */}
        <div className="flex-shrink-0 flex items-center w-72 min-w-[18rem]">
          {isAuthenticated && (
            <div className="w-10 flex items-center justify-center">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={allSelected}
                onChange={() => handleSelectAll(type)}
              />
            </div>
          )}
          <div className={`flex-1 min-w-0 ${isAuthenticated ? 'pl-2' : 'pl-4'}`}>文档名</div>
        </div>
        {/* 右侧功能区 */}
        <div className="w-16 text-center flex-shrink-0">预览</div>
        <div className="w-28 text-center relative flex-shrink-0">
          {isAuthenticated && selected.length > 0 ? (
            <EditableCell
              value={firstDoc?.docType || ""}
              options={DOC_TYPE_OPTIONS.map(o => o.value)}
              editable={true}
              onChange={handleTypeChange}
              placeholder="选择类型"
            />
          ) : (
            <span>类型</span>
          )}
        </div>
        <div className="w-20 text-center relative flex-shrink-0">
          {isAuthenticated && selected.length > 0 ? (
            <EditableCell
              value={firstDoc?.year || ""}
              options={YEAR_OPTIONS}
              editable={true}
              onChange={handleYearChange}
              placeholder="年份"
            />
          ) : (
            <span>年份</span>
          )}
        </div>
        <div className="w-24 text-center relative flex-shrink-0">
          {isAuthenticated && selected.length > 0 ? (
            <EditableCell
              value={firstDoc?.period || ""}
              options={PERIOD_SELECT_OPTIONS.map(o => o.value)}
              editable={true}
              onChange={handlePeriodChange}
              placeholder="期间"
            />
          ) : (
            <span>期间</span>
          )}
        </div>
        <div className="w-32 text-center flex-shrink-0">上传时间</div>
        <div className="w-20 text-center flex-shrink-0">大小</div>
        {isAuthenticated && (
          <div className="w-16 text-center flex-shrink-0">
            {selected.length > 0 && (
              <button
                onClick={() => handleDelete(type)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                删除
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Format upload time for display
  const formatUploadTime = (time: string | undefined) => {
    if (!time) return "-";
    try {
      const date = new Date(time);
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return "-";
    }
  };

  // 渲染表格行
  const renderRow = (
    doc: Document,
    selected: boolean,
    type: "knowledge" | "business",
    onlyOneSelected: boolean
  ) => (
    <div
      key={doc.id}
      className={`flex items-center border-b border-gray-200 py-2 text-sm ${selected ? "bg-gray-50" : ""}`}
    >
      {/* 左侧固定：勾选框+文件名 */}
      <div className="flex-shrink-0 flex items-center w-72 min-w-[18rem] h-full">
        {isAuthenticated && (
          <div className="w-10 flex items-center justify-center h-full">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => handleSelect(doc.id, type)}
              className="w-4 h-4"
            />
          </div>
        )}
        <div className={`flex-1 min-w-0 h-full flex items-center ${isAuthenticated ? 'pl-2' : 'pl-4'}`}>
          {isAuthenticated && selected && onlyOneSelected ? (
            <EditableName
              value={doc.name}
              editable={true}
              onChange={(v) => handleEdit(doc.id, "name", v)}
            />
          ) : (
            <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[16rem]" title={doc.name}>{doc.name}</span>
          )}
        </div>
      </div>
      {/* 右侧功能区 */}
      <div className="w-16 text-center h-full flex items-center justify-center flex-shrink-0">
        <button
          className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-100"
          onClick={() => { setPreviewDoc(doc); setPreviewOpen(true); }}
        >预览</button>
      </div>
      <div className="w-28 text-center h-full flex items-center justify-center flex-shrink-0">
        <span>{formatDocType(doc.docType)}</span>
      </div>
      <div className="w-20 text-center h-full flex items-center justify-center flex-shrink-0">
        <span>{doc.year || "-"}</span>
      </div>
      <div className="w-24 text-center h-full flex items-center justify-center flex-shrink-0">
        <span>{formatPeriod(doc.period)}</span>
      </div>
      <div className="w-32 text-center h-full flex items-center justify-center flex-shrink-0 text-gray-500">
        {formatUploadTime(doc.uploadTime)}
      </div>
      <div className="w-20 text-center h-full flex items-center justify-center flex-shrink-0">
        {doc.size ? `${Math.round(doc.size / 1024)} KB` : "-"}
      </div>
      {isAuthenticated && (
        <div className="w-16 text-center h-full flex items-center justify-center flex-shrink-0">
          {/* Placeholder for alignment with header delete button */}
        </div>
      )}
    </div>
  );

  return (
    <PageContainer maxWidth="4xl">
      {modal}
      <div className="flex flex-col gap-8">
        <section className="w-full">
          <PageTitle className="flex items-center gap-3">
            <span>文档管理</span>
            {isAuthenticated && (
              <span className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                管理员模式
              </span>
            )}
          </PageTitle>
          <p className="text-gray-700 mb-6">
            统一管理数据库文档与待处理文档。
            {isAuthenticated && "（您可以上传、删除、重命名及修改文档属性）"}
          </p>

          {/* Admin Upload Section */}
          {isAuthenticated && (
            <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">上传文档到数据库</h3>
                <button
                  onClick={logout}
                  className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  退出管理员模式
                </button>
              </div>

              <div className="mb-4">
                <label className="font-medium mb-2 block">文档类型：</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-yellow-500"
                >
                  <optgroup label="财务报表">
                    <option value="balance_sheet">资产负债表</option>
                    <option value="income_statement">利润表</option>
                    <option value="cash_flow">现金流量表</option>
                    <option value="financial_report">财务报告</option>
                  </optgroup>
                  <optgroup label="财务信息">
                    <option value="account_detail" disabled>科目明细（暂不可上传）</option>
                  </optgroup>
                  <optgroup label="法规准则">
                    <option value="regulation">法律法规</option>
                    <option value="accounting_standard">会计准则</option>
                    <option value="policy">规章制度</option>
                  </optgroup>
                  <optgroup label="其他信息">
                    <option value="business_info">业务情况</option>
                    <option value="general">其他文档</option>
                  </optgroup>
                </select>
              </div>

              {/* Year/Period selection (for financial statements and financial reports) */}
              {requiresYearPeriod(documentType) && (
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium mb-2 block">年份：</label>
                      <select
                        value={uploadYear}
                        onChange={(e) => setUploadYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-yellow-500"
                      >
                        {YEAR_OPTIONS.map(year => (
                          <option key={year} value={year}>{year}年</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-medium mb-2 block">期间：</label>
                      <select
                        value={uploadPeriod}
                        onChange={(e) => setUploadPeriod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-yellow-500"
                      >
                        {PERIOD_SELECT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Column Mapping (only for structured financial statements, not financial_report) */}
                  {isFinancialStatement(documentType) && (
                    <div className="p-4 bg-gray-50 rounded border border-gray-200">
                      <h4 className="font-bold mb-3 text-sm text-gray-700">Excel 列映射 (请输入列号，如 A, B, C)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium mb-1 block text-gray-600">科目名称列</label>
                          <input
                            type="text"
                            placeholder="例如: A"
                            value={columnMapping.name}
                            onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-yellow-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block text-gray-600">期末余额列</label>
                          <input
                            type="text"
                            placeholder="例如: B"
                            value={columnMapping.periodEnd}
                            onChange={(e) => setColumnMapping({ ...columnMapping, periodEnd: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-yellow-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block text-gray-600">期初余额列</label>
                          <input
                            type="text"
                            placeholder="例如: C"
                            value={columnMapping.periodStart}
                            onChange={(e) => setColumnMapping({ ...columnMapping, periodStart: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-yellow-500 uppercase"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        * 请确保 Excel 文件中对应列包含正确的数据。系统将根据这些列提取财务数据。
                      </p>
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <p className="font-medium mb-1">Excel 科目命名要求：</p>
                        <ul className="list-disc list-inside space-y-1 text-yellow-700">
                          <li>同名子科目需使用父科目前缀区分，例如：「数据资源」，「优先股」和「永续债」</li>
                          <li>系统会自动去除「其中:」「加:」「减:」等前缀和括号说明（如「亏损以&quot;-&quot;号填列」）</li>
                          <li>科目名称需与标准会计科目一致，否则无法识别</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PDF-only notice for certain document types */}
              {PDF_ONLY_TYPES.includes(documentType) && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                  <strong>提示：</strong>此文档类型仅支持 PDF 格式上传。
                </div>
              )}

              <div
                {...getRootProps()}
                className={`w-full p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? "border-black bg-gray-50" : "border-gray-300 hover:border-black"
                  }`}
              >
                <input {...getInputProps()} />
                <p className={`${getStatusColor()} font-medium`}>{getUploadStatusMessage()}</p>
                {currentFileName && uploadStatus === 'success' && (
                  <p className="text-sm text-gray-500 mt-1">{currentFileName}</p>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                支持格式：PDF、PNG、JPG、JPEG、WEBP、GIF、Excel(.xlsx)（Excel 仅限单个工作表）
              </p>
            </div>
          )}

          <div className="mt-8">
            {/* 知识型文档 */}
            <div className="mb-12">
              <div className="text-lg font-bold mb-4">数据库文档</div>
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {renderHeader("knowledge")}
                  {knowledgeDocs.length === 0 ? (
                    <div className="text-gray-400 py-6 text-center">暂无数据库文档</div>
                  ) : (
                    knowledgeDocs.map((doc) =>
                      renderRow(
                        doc,
                        selectedKnowledge.includes(doc.id),
                        "knowledge",
                        selectedKnowledge.length === 1
                      )
                    )
                  )}
                </div>
              </div>
            </div>
            {/* 业务型文档 */}
            <div>
              <div className="text-lg font-bold mb-4">待处理文档</div>
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {renderHeader("business")}
                  {businessDocs.length === 0 ? (
                    <div className="text-gray-400 py-6 text-center">暂无待处理文档</div>
                  ) : (
                    businessDocs.map((doc) =>
                      renderRow(
                        doc,
                        selectedBusiness.includes(doc.id),
                        "business",
                        selectedBusiness.length === 1
                      )
                    )
                  )}
                </div>
              </div>
            </div>

            {/* 分析报告 */}
            <div className="mt-12">
              <div className="text-lg font-bold mb-4">分析报告</div>
              <div className="bg-gray-50 rounded-lg p-4">
                <ReportsList />
              </div>
            </div>
          </div>
        </section>
        {/* 预览弹窗 */}
        {previewOpen && previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 relative flex flex-col"
              style={{ maxHeight: '90vh' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl z-10"
                onClick={() => setPreviewOpen(false)}
                aria-label="关闭"
              >×</button>
              <h3 className="text-xl font-bold mb-3 text-gray-800 flex-shrink-0">{previewDoc.name}</h3>

              {/* Document metadata */}
              <div className="mb-4 text-sm text-gray-700 border-b pb-3 flex-shrink-0">
                <div className="flex flex-wrap gap-4">
                  <p><strong>类型:</strong> {formatDocType(previewDoc.docType)}</p>
                  {previewDoc.year && <p><strong>年份:</strong> {previewDoc.year}</p>}
                  {previewDoc.period && <p><strong>期间:</strong> {formatPeriod(previewDoc.period)}</p>}
                </div>
                {previewDoc.summary?.key_metrics && previewDoc.summary.key_metrics.length > 0 && (
                  <p className="mt-1"><strong>关键指标:</strong> {previewDoc.summary.key_metrics.join('，')}</p>
                )}
                {previewDoc.summary?.summary && (
                  <p className="mt-2"><strong>摘要:</strong> {previewDoc.summary.summary}</p>
                )}
              </div>

              {/* File preview area */}
              <div className="flex-grow overflow-hidden flex flex-col min-h-0">
                {previewLoading ? (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
                    <div className="text-gray-500">加载中...</div>
                  </div>
                ) : previewSignedUrl && previewDoc.fileUrl ? (
                  // Original file preview
                  <div className="flex-grow overflow-hidden">
                    {isPdf(previewDoc.name) && (
                      <iframe
                        src={previewSignedUrl}
                        className="w-full h-full min-h-[500px] rounded border"
                        title="PDF Preview"
                      />
                    )}
                    {isImage(previewDoc.name) && (
                      <div className="flex items-center justify-center h-full bg-gray-50 rounded p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewSignedUrl}
                          alt={previewDoc.name}
                          className="max-w-full max-h-[500px] object-contain"
                        />
                      </div>
                    )}
                    {isExcel(previewDoc.name) && (
                      <div className="bg-gray-50 rounded p-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Excel 文件不支持直接预览，以下为提取的文本内容：
                        </p>
                        {previewDoc.chunks && previewDoc.chunks.length > 0 && (
                          <div className="mt-2">
                            <div className="bg-white rounded p-4 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto border">
                              {previewDoc.chunks.map(chunk => chunk.text).join('\n\n')}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!isPdf(previewDoc.name) && !isImage(previewDoc.name) && !isExcel(previewDoc.name) && (
                      <div className="bg-gray-50 rounded p-4">
                        <p className="text-sm text-gray-600 mb-2">
                          不支持此文件类型的预览。
                        </p>
                        {previewDoc.chunks && previewDoc.chunks.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-2">提取的文本内容：</p>
                            <div className="bg-white rounded p-4 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto border">
                              {previewDoc.chunks.map(chunk => chunk.text).join('\n\n')}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Text content fallback
                  <div className="flex-grow overflow-y-auto">
                    {!previewDoc.fileUrl && (
                      <p className="text-sm text-gray-500 mb-2 italic">原始文件不可用，显示提取的文本内容：</p>
                    )}
                    <div className="bg-gray-50 rounded p-4 text-sm whitespace-pre-wrap">
                      {previewDoc.chunks && previewDoc.chunks.length > 0
                        ? previewDoc.chunks.map(chunk => chunk.text).join('\n\n')
                        : "无内容可预览。"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
