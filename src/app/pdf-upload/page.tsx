"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useDropzone } from "react-dropzone";
import { useDocumentStore, Document } from "../../store/documents";
import DocumentManager from "../../components/DocumentManager";

// Set up the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type AnalysisResult = {
  [key: string]: string | number;
};

export default function PdfUploadPage() {
  const [status, setStatus] = useState<"idle" | "parsing" | "analyzing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [openCopyMenu, setOpenCopyMenu] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState<{ key: string; type: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const addDocument = useDocumentStore((s) => s.addDocument);

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

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  };

  const analyzeText = async (text: string) => {
    setStatus("analyzing");
    setMessage("AI分析中，请稍候...");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || "AI分析服务返回错误");
      }

      const result: AnalysisResult = await res.json();
      setAnalysisResult(result);
      setStatus("success");
      setMessage("分析完成！");
    } catch (err: unknown) {
      console.error("AI Analysis Error:", err);
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      setStatus("error");
      setMessage(`AI分析失败: ${errorMessage}`);
      setAnalysisResult(null);
    }
  };
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    if (!file.type.includes('pdf')) {
      alert('请上传PDF文件');
      return;
    }

    setStatus("parsing");
    setMessage("正在解析PDF...");
    
    try {
      const text = await extractTextFromPDF(file);
      if (text.trim().length === 0) {
        throw new Error("PDF文件无法提取文本内容");
      }
      await analyzeText(text);
    } catch (err: unknown) {
      console.error("PDF Processing Error:", err);
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      setStatus("error");
      setMessage(`PDF处理失败: ${errorMessage}`);
      setAnalysisResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });
  
  const getStatusMessage = () => {
    if (status === 'idle') return "将PDF文件拖拽到此处，或点击选择文件";
    if (isDragActive) return "松开即可开始解析...";
    if (status === 'parsing') return "正在解析PDF...";
    if (status === 'analyzing') return "AI分析中...";
    return message;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <div className="p-6 border rounded-lg shadow-md bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">智能文档分析</h1>
        <p className="text-gray-600 mb-6">上传PDF财务文档（如发票、合同），AI将自动提取关键信息。</p>
        <div
          {...getRootProps()}
          className={`w-full p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-gray-500">{getStatusMessage()}</p>
        </div>
      </div>

      {analysisResult && (
        <div className="mt-8 p-6 border rounded-lg shadow-md bg-white">
          <h2 className="text-xl font-bold mb-4 text-gray-800">分析结果</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analysisResult).map(([key, value]) => (
              <div key={key} className="p-4 bg-gray-50 rounded-lg border relative">
                <p className="text-sm font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-lg font-semibold text-gray-800 break-words">{String(value)}</p>
                
                <div className="absolute top-2 right-2" ref={openCopyMenu === key ? menuRef : null}>
                  <button
                    onClick={() => setOpenCopyMenu(openCopyMenu === key ? null : key)}
                    className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="More options"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {openCopyMenu === key && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border">
                      <button onClick={() => handleCopy(key, value, 'key')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        {copiedState?.key === key && copiedState?.type === 'key' ? '已复制!' : '复制标题'}
                      </button>
                      <button onClick={() => handleCopy(key, value, 'value')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        {copiedState?.key === key && copiedState?.type === 'value' ? '已复制!' : '复制内容'}
                      </button>
                      <button onClick={() => handleCopy(key, value, 'both')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
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
      {/* 全局文档管理区 */}
      <div className="mt-10">
        <h2 className="text-lg font-bold mb-4 text-gray-700">所有已上传文档（全局管理）</h2>
        <DocumentManager showCategory={true} />
      </div>
    </div>
  );
} 