"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useDocumentStore } from "../../store/documents";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import { checkAndIncreaseApiLimit } from "../../lib/rateLimit";
import Link from "next/link";

type AnalysisResult = {
  [key: string]: string | number;
};

// Supported file types
const SUPPORTED_FORMATS = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default function DataExtractPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [openCopyMenu, setOpenCopyMenu] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState<{ key: string; type: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'reading' | 'uploading' | 'processing' | 'success' | 'error' | 'unsupported' | 'too_large' | 'rate_limit'>('idle');
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  const handleCopy = (key: string, value: string | number, type: "key" | "value" | "both") => {
    const textToCopy = {
      key: key,
      value: String(value),
      both: `${key}: ${String(value)}`,
    }[type];

    navigator.clipboard.writeText(textToCopy);
    setCopiedState({ key, type });
    setTimeout(() => setCopiedState(null), 2000);
    setTimeout(() => setOpenCopyMenu(null), 300);
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

  // Convert file to Base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure Base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (uploadStatus !== 'idle' && uploadStatus !== 'reading' && uploadStatus !== 'uploading' && uploadStatus !== 'processing') {
      const timer = setTimeout(() => setUploadStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const addDocument = useDocumentStore((s) => s.addDocument);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Rate limit check for demo mode
    if (!checkAndIncreaseApiLimit(10)) {
      setUploadStatus('rate_limit');
      return;
    }

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      setUploadStatus('too_large');
      return;
    }

    setUploadStatus('reading');
    setCurrentFileName(file.name);
    setAnalysisResult(null);

    try {
      const base64Data = await convertToBase64(file);

      // Demo mode: Send to AI for extraction
      setAnalyzing(true);
      setUploadStatus('uploading');

      // 1. Upload to Temp Storage (Vectorization)
      const uploadResponse = await fetch('/api/documents/upload-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Data,
          fileType: file.type,
          fileName: file.name,
          source: 'data-extract'
        }),
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '上传失败');
      }

      // Add to global store so it appears in "Pending Documents"
      addDocument({
        id: uploadResult.documentId,
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : 'knowledge',
        docCategory: 'business',
        uploadTime: new Date().toISOString(),
        status: 'ready',
        size: file.size,
        is_temp: true,
        summary: {
          document_type: 'temp_upload',
          summary: uploadResult.textPreview || 'Temporary document',
          key_metrics: [],
          time_period: ''
        }
      });

      // 2. AI Extraction
      setUploadStatus('processing');
      const extractResponse = await fetch('/api/data-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Data,
          fileType: file.type,
          fileName: file.name
        }),
      });

      const extractResult = await extractResponse.json();

      if (!extractResult.success) throw new Error(extractResult.message || 'AI分析服务返回错误');

      setAnalysisResult(extractResult.data);
      setUploadStatus('success');
    } catch (err: unknown) {
      setUploadStatus('error');
      console.error('Processing Error:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      alert(`处理失败: ${errorMessage}`);
    } finally {
      setAnalyzing(false);
    }
  }, [addDocument]);

  const getUploadStatusMessage = () => {
    switch (uploadStatus) {
      case 'reading': return '正在读取文件...';
      case 'uploading': return '正在上传文档...';
      case 'processing': return 'AI 正在提取关键信息...';
      case 'unsupported': return '文件格式不支持';
      case 'too_large': return '文件大小超过 2MB';
      case 'rate_limit': return '今日体验次数已达上限';
      case 'success': return '提取完成';
      case 'error': return '处理失败';
      default: return '点击或拖拽上传文件';
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success': return 'text-green-600';
      case 'error':
      case 'unsupported':
      case 'too_large':
      case 'rate_limit': return 'text-red-600';
      case 'reading':
      case 'uploading':
      case 'processing': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection?.errors[0]?.code === 'file-too-large') {
        setUploadStatus('too_large');
      } else {
        setUploadStatus('unsupported');
      }
    }
  });

  return (
    <PageContainer maxWidth="3xl">
      <div className="flex flex-col gap-8">
        <section className="w-full">
          <div className="mb-6">
            <PageTitle>财务信息提取</PageTitle>
            <p className="mb-2 text-gray-700">
              上传财务文档（发票、合同），AI 将自动识别并提取关键信息，输出为可复制的格式化结果。该文档也可在其他模块中使用。
            </p>
            <p className="mb-2 text-gray-700">
              仍有疑问？请在
              <Link href="/about#faq" className="text-yellow-500 underline hover:text-yellow-400 transition-colors">关于/帮助</Link>
              页面获取指引，或跳转查看
              <Link href="/showcase#extract" className="text-yellow-500 underline hover:text-yellow-400 transition-colors">演示案例</Link>。
            </p>
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <div className="font-bold mb-2">上传需要提取信息的文档</div>
            <div
              {...getRootProps()}
              className={`w-full p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? "border-black bg-gray-50" : "border-gray-300 hover:border-black"
                } ${analyzing ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />
              <p className={`${getStatusColor()} font-medium`}>{getUploadStatusMessage()}</p>
              {currentFileName && uploadStatus === 'success' && (
                <p className="text-sm text-gray-500 mt-1">{currentFileName}</p>
              )}
            </div>
            {/* Supported formats hint */}
            <p className="text-sm text-gray-500 mt-2">
              支持格式：PDF、PNG、JPG、JPEG、WEBP、GIF（最大 2MB）
            </p>
          </div>

          {/* Analysis Results */}
          <div className="mb-6">
            <div className="font-bold mb-2">提取结果</div>
            {analysisResult ? (
              <div className="p-6 rounded-lg bg-white border border-gray-200">
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
            ) : (
              <div className="p-6 rounded-lg bg-gray-50 border border-gray-200 text-center text-gray-500">
                上传文档后，提取结果将在此处显示
              </div>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
