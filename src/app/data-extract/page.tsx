"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useDocumentStore, Document } from "../../store/documents";
import DocumentSelectModal from "../../components/DocumentSelectModal";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import { checkAndIncreaseApiLimit } from "../../lib/rateLimit";
import Link from "next/link";

// Set up the worker source for pdfjs-dist
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type AnalysisResult = {
  [key: string]: string | number;
};

export default function PdfUploadPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [openCopyMenu, setOpenCopyMenu] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState<{ key: string; type: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'unsupported'>('idle');
  const [analyzing, setAnalyzing] = useState(false);
  const documents = useDocumentStore((s) => s.documents);
  const businessDocs = documents.filter(doc => doc.docCategory === 'business');
  const selectedBusinessDoc = businessDocs.find(doc => doc.id === selectedBusinessId);
  const [modalOpen, setModalOpen] = useState(false);

  // 新增：自动选中新上传的业务型文档
  useEffect(() => {
    if (uploadStatus === 'success' && businessDocs.length > 0) {
      // 找到最新上传的业务型文档
      const latestDoc = businessDocs.reduce((a, b) => (a.uploadTime > b.uploadTime ? a : b));
      if (latestDoc && latestDoc.id !== selectedBusinessId) {
        setSelectedBusinessId(latestDoc.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadStatus, businessDocs.length]);

  const handleCopy = (key: string, value: string | number, type: "key" | "value" | "both") => {
    const textToCopy = {
      key: key,
      value: String(value),
      both: `${key}: ${String(value)}`,
    }[type];

    navigator.clipboard.writeText(textToCopy);
    setCopiedState({ key, type });
    setTimeout(() => setCopiedState(null), 2000);
    setTimeout(() => setOpenCopyMenu(null), 300); // Close menu after copy
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenCopyMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const processPDF = useCallback(async (file: File): Promise<string> => {
    if (typeof window === "undefined") return "";
    const pdfjsLib = await import("pdfjs-dist/build/pdf");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: { str?: string }) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      }).join(" ") + "\n";
    }
    return fullText;
  }, []);

  useEffect(() => {
    if (uploadStatus !== 'idle' && uploadStatus !== 'uploading') {
      const timer = setTimeout(() => setUploadStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (!checkAndIncreaseApiLimit(10)) {
      alert("今日体验次数已达上限，请明天再试或联系作者获取更多体验权限。");
      return;
    }

    if (!file.type.includes('pdf')) {
      setUploadStatus('unsupported');
      return;
    }
    if (file.size > 1048576) {
      setUploadStatus('error');
      alert('文件大小不能超过1MB');
      return;
    }
    setUploadStatus('uploading');
    try {
      const text = await processPDF(file);
      if (text.trim().length === 0) {
        setUploadStatus('error');
        throw new Error('PDF文件无法提取文本内容');
      }
      // 上传完毕，添加文档但不自动分析
      const newDoc: Document = {
        id: `business-${Date.now()}`,
        name: file.name,
        type: 'pdf',
        docCategory: 'business',
        uploadTime: new Date().toISOString(),
        status: 'ready',
        size: file.size,
        summary: { summary: text, document_type: '', key_metrics: [], time_period: '' },
        chunks: [],
      };
      addDocument(newDoc);
      setUploadStatus('success');
    } catch (err: unknown) {
      setUploadStatus('error');
      console.error('PDF Processing Error:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      // setMessage(`PDF处理失败: ${errorMessage}`); // This line was removed
      setAnalysisResult(null);
    }
  }, [addDocument, processPDF]);

  const handleStartAnalysis = async () => {
    if (!selectedBusinessDoc) return;
    if (!checkAndIncreaseApiLimit(10)) {
      alert("今日体验次数已达上限，请明天再试或联系作者获取更多体验权限。");
      return;
    }
    setAnalyzing(true);
    try {
      // 优先用summary.summary
      const text = selectedBusinessDoc.summary?.summary || '';
      if (!text.trim()) throw new Error('文档内容为空，无法分析');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'AI分析服务返回错误');
      }
      const result: AnalysisResult = await res.json();
      setAnalysisResult(result);
    } catch (err: unknown) {
      console.error('AI Analysis Error:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      // setMessage(`AI分析失败: ${errorMessage}`); // This line was removed
      setAnalysisResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const getUploadStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading': return '上传中...';
      case 'unsupported': return '文件类型不支持';
      case 'success': return '上传完毕';
      case 'error': return '上传失败';
      default: return '请在此处上传需分析的文件';
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });
  
  return (
    <PageContainer maxWidth="3xl">
      <div className="flex flex-col gap-8">
        <section className="w-full">
          <div className="mb-6">
            <PageTitle>财务信息提取</PageTitle>
            <p className="mb-2 text-gray-700">
              上传 PDF 格式财务文档（如发票、合同），AI 将自动提取关键信息，并输出为可以自由复制内容的格式化结果。
            </p>
            <p className="mb-2 text-gray-700">
              仍有疑问？请在
              <Link href="/about" className="text-yellow-500 underline hover:text-yellow-400 transition-colors">关于/帮助</Link>
              页面获取指引，或跳转查看
              <Link href="/showcase#extract" className="text-yellow-500 underline hover:text-yellow-400 transition-colors">演示案例</Link>。
            </p>
          </div>
            <div className="mb-6">
              <div className="font-bold mb-2">第一步：上传需分析的文档（电子版 PDF 格式，小于1MB）</div>
              <div
                {...getRootProps()}
                className={`w-full p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-black bg-gray-50" : "border-gray-300 hover:border-black"
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-gray-500">{getUploadStatusMessage()}</p>
              </div>
            </div>
            <div className="mb-6">
              <div className="font-bold mb-2">第二步：从已上传的文档中选择需要提取信息的文档</div>
              {/* 已选文档展示区 */}
              {selectedBusinessDoc ? (
                <div className="mb-2 p-3 bg-gray-50 rounded border border-gray-200 flex items-center gap-2">
                  <span className="font-medium text-black">{selectedBusinessDoc.name}</span>
                  <button
                    className="ml-2 text-xs text-gray-500 hover:underline"
                    onClick={() => setSelectedBusinessId(null)}
                  >取消选择</button>
                </div>
              ) : (
                <div className="mb-2 min-h-[32px]" />
              )}
              {/* 按钮区 */}
              <div className="flex gap-4 items-center">
                <button
                  className="border border-black rounded px-4 py-2 font-medium bg-white hover:bg-gray-100 transition-colors"
                  onClick={() => setModalOpen(true)}
                  type="button"
                >文档选择</button>
                <div className="flex-1" />
                <button
                  className={`border border-black rounded px-4 py-2 font-medium transition-colors ${selectedBusinessDoc ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  onClick={selectedBusinessDoc ? handleStartAnalysis : undefined}
                  type="button"
                  disabled={!selectedBusinessDoc || analyzing}
                  title={selectedBusinessDoc ? '' : '请选择需要分析的文档'}
                >{analyzing ? '分析中...' : '分析'}</button>
              </div>
              {/* 文档选择弹窗 */}
              <DocumentSelectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                mode="single"
                categories={["business"]}
                selectedIds={selectedBusinessId ? [selectedBusinessId] : []}
                onSelect={ids => {
                  setSelectedBusinessId(ids[0] || null);
                  setModalOpen(false);
                }}
                showUpload={false}
              />
            </div>
            <div className="mb-6">
              <div className="font-bold mb-2">第三步：分析结果将在此处展示</div>
              {selectedBusinessDoc && analysisResult && (
                <div className="p-6 rounded-lg bg-white">
                  <h2 className="text-xl font-bold mb-4">分析结果</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(analysisResult).map(([key, value]) => (
                      <div key={key} className="p-4 bg-gray-50 rounded-lg relative">
                        <p className="text-sm font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-lg font-semibold text-black break-words">{String(value)}</p>
                        <div className="absolute top-2 right-2" ref={openCopyMenu === key ? menuRef : null}>
                          <button
                            onClick={() => setOpenCopyMenu(openCopyMenu === key ? null : key)}
                            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                            aria-label="More options"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {openCopyMenu === key && (
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                              <button onClick={() => handleCopy(key, value, 'key')} className="w-full text-left px-4 py-2 text-sm border-b border-gray-100 hover:bg-black hover:text-white transition-colors">
                                {copiedState?.key === key && copiedState?.type === 'key' ? '已复制!' : '复制标题'}
                              </button>
                              <button onClick={() => handleCopy(key, value, 'value')} className="w-full text-left px-4 py-2 text-sm border-b border-gray-100 hover:bg-black hover:text-white transition-colors">
                                {copiedState?.key === key && copiedState?.type === 'value' ? '已复制!' : '复制内容'}
                              </button>
                              <button onClick={() => handleCopy(key, value, 'both')} className="w-full text-left px-4 py-2 text-sm hover:bg-black hover:text-white transition-colors">
                                {copiedState?.key === key && copiedState?.type === 'both' ? '已复制!' : '复制全部'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </PageContainer>
    );
} 