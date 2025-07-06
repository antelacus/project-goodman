"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";
import { useDocumentStore, Document } from "../../store/documents";
import DocumentManager from "../../components/DocumentManager";

// Set up the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export default function KnowledgeChatPage() {
  const documents = useDocumentStore((s) => s.documents);
  const isLoading = useDocumentStore((s) => s.isLoading);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const loadDocumentsFromJsonDir = useDocumentStore((s) => s.loadDocumentsFromJsonDir);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedKnowledgeDocs, setSelectedKnowledgeDocs] = useState<string[]>([]);
  const [selectedBusinessDocs, setSelectedBusinessDocs] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // 获取知识型文档
  const knowledgeDocuments = documents.filter(doc => doc.docCategory === "knowledge");
  const businessDocuments = documents.filter(doc => doc.docCategory === "business");

  // 处理文件上传
  const processFile = useCallback(async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      return await processPDF(file);
    } else if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return await processExcel(file);
    } else if (file.type === "text/plain" || file.type === "text/csv") {
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
    }

    return fullText;
  };

  const processExcel = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    let fullText = "";

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      fullText += `工作表: ${sheetName}\n`;
      jsonData.forEach((row) => {
        if (Array.isArray(row)) {
          fullText += row.join("\t") + "\n";
        }
      });
      fullText += "\n";
    });

    return fullText;
  };

  // 上传业务型文档
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await processFile(file);
      
      // 生成文档ID
      const documentId = `business-${Date.now()}`;
      
      // 调用文档处理API
      const response = await fetch("/api/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          documentId,
          fileName: file.name
        }),
      });

      if (!response.ok) {
        throw new Error("文档处理失败");
      }

      const result = await response.json();
      
      // 创建文档对象
      const newDocument: Document = {
        id: documentId,
        name: file.name,
        type: file.name.split('.').pop()?.toLowerCase() as any || "txt",
        docCategory: "business",
        uploadTime: new Date().toISOString(),
        status: "ready",
        size: file.size,
        summary: result.summary,
        chunks: result.chunks
      };

      // 添加到文档存储
      addDocument(newDocument);
      
      // 自动选中新上传的文档
      setSelectedBusinessDocs(prev => [...prev, documentId]);
      
    } catch (error) {
      console.error("File processing error:", error);
      alert("文件处理失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  }, [processFile, addDocument]);

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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsSending(true);

    try {
      // 获取选中的业务型文档内容
      const selectedBusinessDocsData = businessDocuments.filter(doc => 
        selectedBusinessDocs.includes(doc.id)
      );

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: inputMessage,
          documentIds: selectedKnowledgeDocs,
          chatHistory: chatMessages,
          businessDocuments: selectedBusinessDocsData
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "抱歉，我遇到了一个错误。请稍后再试。",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  return (
    <div className="max-w-6xl mx-auto mt-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">合规性指导</h1>
        <p className="text-gray-600">基于知识型文档和业务型文档进行合规性分析和指导</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：文档管理 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 知识型文档 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">知识型文档</h2>
            <p className="text-gray-600 mb-4 text-sm">选择用于合规性指导的知识型文档：</p>
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                <div className="text-2xl mb-2">⏳</div>
                <p className="text-sm">正在加载...</p>
              </div>
            ) : knowledgeDocuments.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <div className="text-2xl mb-2">📚</div>
                <p className="text-sm">暂无知识型文档</p>
              </div>
            ) : (
              <div className="space-y-2">
                {knowledgeDocuments.map(doc => (
                  <label key={doc.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedKnowledgeDocs.includes(doc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedKnowledgeDocs(prev => [...prev, doc.id]);
                        } else {
                          setSelectedKnowledgeDocs(prev => prev.filter(id => id !== doc.id));
                        }
                      }}
                      className="accent-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 业务型文档上传 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">业务型文档</h2>
            <p className="text-gray-600 mb-4 text-sm">上传需要分析的业务型文档：</p>
            
            {/* 文件上传区域 */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              {isProcessing ? (
                <div>
                  <div className="text-2xl mb-2">⏳</div>
                  <p className="text-sm text-gray-600">正在处理文档...</p>
                </div>
              ) : isDragActive ? (
                <div>
                  <div className="text-2xl mb-2">📁</div>
                  <p className="text-sm text-blue-600">释放文件以上传</p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">📤</div>
                  <p className="text-sm text-gray-600">拖拽文件到此处，或点击选择文件</p>
                  <p className="text-xs text-gray-500 mt-1">支持 PDF、Excel、TXT、CSV 格式</p>
                </div>
              )}
            </div>

            {/* 已上传的业务型文档 */}
            {businessDocuments.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">已上传的文档：</h3>
                <div className="space-y-2">
                  {businessDocuments.map(doc => (
                    <label key={doc.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBusinessDocs.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBusinessDocs(prev => [...prev, doc.id]);
                          } else {
                            setSelectedBusinessDocs(prev => prev.filter(id => id !== doc.id));
                          }
                        }}
                        className="accent-blue-500"
                      />
                      <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：聊天界面 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">AI 合规助手</h2>
              <button
                onClick={clearChat}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                清空对话
              </button>
            </div>

            {/* 当前选中的文档提示 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>当前选中文档：</strong>
                {selectedKnowledgeDocs.length === 0 && selectedBusinessDocs.length === 0 ? (
                  "未选择任何文档"
                ) : (
                  <>
                    {selectedKnowledgeDocs.length > 0 && (
                      <span className="block">
                        知识型：{selectedKnowledgeDocs.map(id => knowledgeDocuments.find(d => d.id === id)?.name).filter(Boolean).join('，')}
                      </span>
                    )}
                    {selectedBusinessDocs.length > 0 && (
                      <span className="block">
                        业务型：{selectedBusinessDocs.map(id => businessDocuments.find(d => d.id === id)?.name).filter(Boolean).join('，')}
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* 聊天消息区域 */}
            <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <div className="text-4xl mb-4">🤖</div>
                  <p>开始与AI助手对话，询问合规性问题</p>
                  <p className="text-sm mt-2">例如："基于这些财务准则，我们的处理方式是否符合合规要求？"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
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
                onKeyPress={handleKeyPress}
                placeholder="输入您的合规性问题..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || !inputMessage.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? "发送中..." : "发送"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 