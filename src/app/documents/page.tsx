"use client";
import React, { useState } from "react";
import { useDocumentStore, Document } from "../../store/documents";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";

const KNOWLEDGE_TYPES = ["会计准则", "财务报表", "法律法规", "规章制度"];
const BUSINESS_TYPES = ["发票", "合同", "记账凭证"];
const YEARS = Array.from({ length: 20 }, (_, i) => `${2025 - i}`);
const PERIOD_OPTIONS = ["长期有效", ...YEARS];

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
  return editable ? (
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
  ) : (
    <span>{value}</span>
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
  React.useEffect(() => setInput(baseName), [value]);
  React.useEffect(() => { if (editable) setInput(baseName); }, [editable, baseName]);
  return editable ? (
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
  ) : (
    <span>{value}</span>
  );
}

export default function DocumentsPage() {
  const documents = useDocumentStore((s) => s.documents);
  const updateDocument = useDocumentStore((s) => s.updateDocument);
  const knowledgeDocs = documents.filter((d) => d.docCategory === "knowledge");
  const businessDocs = documents.filter((d) => d.docCategory === "business");

  // 选择状态
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string[]>([]);
  // 预览弹窗
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  // 编辑属性
  const handleEdit = (id: string, field: "type" | "period" | "name", value: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    if (field === "type") {
      updateDocument(id, {
        summary: {
          document_type: value,
          summary: doc.summary?.summary || "",
          key_metrics: doc.summary?.key_metrics || [],
          time_period: doc.summary?.time_period || ""
        },
      });
    } else if (field === "period") {
      updateDocument(id, {
        summary: {
          document_type: doc.summary?.document_type || "",
          summary: doc.summary?.summary || "",
          key_metrics: doc.summary?.key_metrics || [],
          time_period: value
        },
      });
    } else if (field === "name") {
      updateDocument(id, { name: value });
    }
  };

  // 属性行下拉编辑（直接在表头显示）
  const renderHeader = (type: "knowledge" | "business") => {
    const selected = type === "knowledge" ? selectedKnowledge : selectedBusiness;
    const docs = type === "knowledge" ? knowledgeDocs : businessDocs;
    const allSelected = type === "knowledge" ? allKnowledgeSelected : allBusinessSelected;
    const handleTypeChange = (v: string) => selected.forEach(id => handleEdit(id, "type", v));
    const handlePeriodChange = (v: string) => selected.forEach(id => handleEdit(id, "period", v));
    const firstDoc = docs.find(d => selected.includes(d.id));
    return (
      <div className="flex font-semibold border-b border-gray-200 pb-2 text-gray-700">
        {/* 左侧固定：勾选框+文档名 */}
        <div className="flex-shrink-0 flex items-center w-60 min-w-[16rem]">
          <div className="w-12 flex items-center justify-center">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={allSelected}
              onChange={() => handleSelectAll(type)}
            />
          </div>
          <div className="flex-1 min-w-0 pl-4">文档名</div>
        </div>
        {/* 右侧功能区 */}
        <div className="w-20 text-center flex-shrink-0">预览</div>
        <div className="w-32 text-center relative flex-shrink-0">
          {selected.length > 0 ? (
            <EditableCell
              value={firstDoc?.summary?.document_type || ""}
              options={type === "knowledge" ? KNOWLEDGE_TYPES : BUSINESS_TYPES}
              editable={true}
              onChange={handleTypeChange}
              placeholder="选择类型"
            />
          ) : (
            <span>类型</span>
          )}
        </div>
        <div className="w-32 text-center relative flex-shrink-0">
          {selected.length > 0 ? (
            <EditableCell
              value={firstDoc?.summary?.time_period || ""}
              options={PERIOD_OPTIONS}
              editable={true}
              onChange={handlePeriodChange}
              placeholder="选择期别"
            />
          ) : (
            <span>期别</span>
          )}
        </div>
        <div className="w-24 text-center flex-shrink-0">大小</div>
      </div>
    );
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
      className={`flex items-center border-b border-gray-200 ${selected ? "bg-gray-50" : ""}`}
    >
      {/* 左侧固定：勾选框+文件名 */}
      <div className="flex-shrink-0 flex items-center w-60 min-w-[16rem] h-full">
        <div className="w-12 flex items-center justify-center h-full">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => handleSelect(doc.id, type)}
            className="w-4 h-4"
          />
        </div>
        <div className="flex-1 min-w-0 h-full flex items-center pl-4">
          {type === "business" && selected && onlyOneSelected ? (
            <EditableName
              value={doc.name}
              editable={true}
              onChange={(v) => handleEdit(doc.id, "name", v)}
            />
          ) : (
            <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[20rem]">{doc.name}</span>
          )}
        </div>
      </div>
      {/* 右侧功能区 */}
      <div className="w-20 text-center h-full flex items-center justify-center flex-shrink-0">
        <button
          className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-100"
          onClick={() => { setPreviewDoc(doc); setPreviewOpen(true); }}
        >预览</button>
      </div>
      <div className="w-32 text-center h-full flex items-center justify-center flex-shrink-0">
        <span>{doc.summary?.document_type || "-"}</span>
      </div>
      <div className="w-32 text-center h-full flex items-center justify-center flex-shrink-0">
        <span>{doc.summary?.time_period || "-"}</span>
      </div>
      <div className="w-24 text-center h-full flex items-center justify-center flex-shrink-0">
        {doc.size ? `${Math.round(doc.size / 1024)} KB` : "-"}
      </div>
    </div>
  );

  return (
    <PageContainer maxWidth="3xl">
      <div className="flex flex-col gap-8">
        <section className="w-full">
          <PageTitle>文档管理</PageTitle>
          <p className="text-gray-700 mb-6">
            统一管理数据库文档与待处理文档，支持分类、批量选择、属性编辑和重命名。<br />
            <br />
            (出于演示目的，该功能模块对文档的修改结果不会永久保存，关闭网站所有页面后修改即失效。)
            </p>
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
          </div>
        </section>
        {/* 预览弹窗 */}
        {previewOpen && previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative flex flex-col"
              style={{ maxHeight: '85vh' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl z-10"
                onClick={() => setPreviewOpen(false)}
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
      </div>
    </PageContainer>
  );
} 