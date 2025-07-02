"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";
import { useDocumentStore, Document } from "../../store/documents";
import DocumentManager from "../../components/DocumentManager";

// Set up the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type DocumentSummary = {
  document_type: string;
  summary: string;
  key_metrics: string[];
  time_period: string;
};

type DocumentChunk = {
  id: string;
  text: string;
  embedding: number[];
  chunkIndex: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export default function FinancialAnalysisPage() {
  const documents = useDocumentStore((s) => s.documents);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const updateDocument = useDocumentStore((s) => s.updateDocument);
  const loadDocumentsFromJsonDir = useDocumentStore((s) => s.loadDocumentsFromJsonDir);
  const setDocuments = useDocumentStore((s) => s.setDocuments);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "documents" | "chat">("upload");
  const [processingProgress, setProcessingProgress] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [docCategory, setDocCategory] = useState<"knowledge" | "business">("business");

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // 初始化时加载本地JSON文档
  useEffect(() => {
    loadDocumentsFromJsonDir();
  }, [loadDocumentsFromJsonDir]);

  const processFile = useCallback(async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      return await processPDF(file);
    } else if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return await processExcel(file);
    } else if (file.type === "text/plain" || file.type === "text/csv") {
      // 纯文本/CSV直接读取
      return await file.text();
    } else {
      throw new Error("不支持的文件格式");
    }
  }, []);

  const processPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      }).join(" ") + "\n";
      setProcessingProgress((i / pdf.numPages) * 50); // PDF处理占50%
    }

    return fullText;
  };

  const processExcel = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    let fullText = "";

    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      fullText += `工作表: ${sheetName}\n`;
      jsonData.forEach((row) => {
        if (Array.isArray(row)) {
          fullText += row.join("\t") + "\n";
        }
      });
      fullText += "\n";
      
      setProcessingProgress(50 + (index / workbook.SheetNames.length) * 30); // Excel处理占30%
    });

    return fullText;
  };

  // 上传逻辑：选择本地JSON文件并加载
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      alert('请上传预处理后的JSON文档');
      return;
    }
    setIsProcessing(true);
    setProcessingProgress(0);
    try {
      const text = await file.text();
      const doc = JSON.parse(text);
      addDocument(doc);
      setProcessingProgress(100);
      setTimeout(() => setProcessingProgress(0), 1000);
      setActiveTab("documents");
    } catch (err: unknown) {
      alert('加载JSON文档失败');
    } finally {
      setIsProcessing(false);
    }
  }, [addDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/plain": [".txt"],
      "text/csv": [".csv"]
    },
    maxFiles: 1,
  });

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsSending(true);

    try {
      // 调用聊天API
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: inputMessage,
          documentIds: selectedDocuments.length > 0 ? selectedDocuments : [],
          chatHistory: chatMessages.slice(-10) // 发送最近10轮对话
        }),
      });

      if (!chatResponse.ok) {
        throw new Error("AI回复失败");
      }

      const chatResult = await chatResponse.json();

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: chatResult.response,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiMessage]);

    } catch (err: unknown) {
      console.error("Chat Error:", err);
      
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "抱歉，我暂时无法回答您的问题。请稍后重试。",
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 多选文档切换
  const toggleSelectDocument = (docId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  return (
    <div className="max-w-6xl mx-auto mt-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">财务智能分析</h1>
        <p className="text-gray-600">上传财务文档，AI将为您提供智能分析和预测</p>
      </div>

      {/* 标签页导航 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "upload"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          上传文档
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "documents"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          文档管理 ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          AI对话
        </button>
      </div>

      {/* 上传文档标签页 */}
      {activeTab === "upload" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">上传财务文档</h2>
          {/* 文档类型选择 - 只允许业务型 */}
          <div className="mb-4 flex items-center gap-6">
            <label className="font-medium text-gray-700">文档类型：</label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="accent-blue-500"
                name="docCategory"
                value="business"
                checked={docCategory === "business"}
                onChange={() => setDocCategory("business")}
                disabled
              />
              <span className="ml-2">业务型文档（仅支持前端上传）</span>
            </label>
            <label className="inline-flex items-center text-gray-400">
              <input
                type="radio"
                className="accent-blue-500"
                name="docCategory"
                value="knowledge"
                checked={docCategory === "knowledge"}
                disabled
              />
              <span className="ml-2">知识型文档（请用Python脚本上传）</span>
            </label>
          </div>
          <div
            {...getRootProps()}
            className={`w-full p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="text-6xl text-gray-400">📄</div>
              <p className="text-lg text-gray-600">
                {isDragActive ? "松开上传文件" : "拖拽文件到此处，或点击选择文件"}
              </p>
              <p className="text-sm text-gray-500">
                支持 PDF（.pdf）、Excel（.xlsx）、纯文本（.txt）、CSV（.csv）格式，文件大小不超过 2MB
              </p>
            </div>
          </div>

          {isProcessing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">处理进度</span>
                <span className="text-sm text-gray-600">{processingProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 文档管理标签页 */}
      {activeTab === "documents" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">文档管理</h2>
          <DocumentManager
            selectedIds={selectedDocuments}
            onSelect={setSelectedDocuments}
            showCategory={true}
          />
        </div>
      )}

      {/* AI对话标签页 */}
      {activeTab === "chat" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">AI财务助手</h2>
          {/* 当前选中的文档列表 */}
          <div className="mb-2 text-xs text-blue-600">
            当前选中文档: {selectedDocuments.length === 0 ? '（未选择，默认全部）' : selectedDocuments.map(id => {
              const doc = documents.find(d => d.id === id);
              return doc ? `${doc.name}（${doc.docCategory === 'business' ? '业务型' : '知识型'}）` : '';
            }).filter(Boolean).join('，')}
          </div>
          {/* 文档多选器 */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {documents.map(doc => (
                <button
                  key={doc.id}
                  className={`px-2 py-1 rounded border text-xs ${selectedDocuments.includes(doc.id) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300'} transition`}
                  onClick={() => toggleSelectDocument(doc.id)}
                >
                  {doc.name} <span className="ml-1 text-gray-400">[{doc.docCategory === 'business' ? '业务型' : '知识型'}]</span>
                </button>
              ))}
            </div>
          </div>
          {/* 聊天消息区域 */}
          <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                <div className="text-4xl mb-4">🤖</div>
                <p>开始与AI助手对话，询问您的财务数据</p>
                <p className="text-sm mt-2">例如：&quot;我们的现金流状况如何？&quot;</p>
                {selectedDocuments.length > 0 && (
                  <p className="text-xs mt-2 text-blue-600">
                    当前选中文档: {selectedDocuments.map(id => documents.find(d => d.id === id)?.name).filter(Boolean).join('，')}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-white border text-gray-800"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-white border text-gray-800 px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="输入您的问题..."
              disabled={isSending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isSending}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? "发送中..." : "发送"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 