"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDocumentStore, Document } from "../../store/documents";
import DocumentManager from "../../components/DocumentManager";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export default function FinancialAnalysisPage() {
  const documents = useDocumentStore((s) => s.documents);
  const isLoading = useDocumentStore((s) => s.isLoading);
  const loadDocumentsFromJsonDir = useDocumentStore((s) => s.loadDocumentsFromJsonDir);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"documents" | "chat">("documents");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

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

  // 只显示知识型文档
  const knowledgeDocuments = documents.filter(doc => doc.docCategory === "knowledge");

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
        <p className="text-gray-600">基于知识型文档进行财务分析和预测</p>
      </div>

      {/* 标签页导航 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "documents"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          知识型文档 ({isLoading ? "..." : knowledgeDocuments.length})
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

      {/* 文档管理标签页 */}
      {activeTab === "documents" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">知识型文档管理</h2>
          <p className="text-gray-600 mb-4">选择以下知识型文档用于财务分析和预测：</p>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">⏳</div>
              <p>正在加载知识型文档...</p>
            </div>
          ) : knowledgeDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📚</div>
              <p>暂无知识型文档</p>
              <p className="text-sm mt-2">请确保 data/documents/ 目录中包含预处理的知识型文档</p>
            </div>
          ) : (
            <DocumentManager
              selectedIds={selectedDocuments}
              onSelect={setSelectedDocuments}
              showCategory={false}
            />
          )}
        </div>
      )}

      {/* AI对话标签页 */}
      {activeTab === "chat" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">AI财务助手</h2>
          {/* 当前选中的文档列表 */}
          <div className="mb-2 text-xs text-blue-600">
            当前选中文档: {selectedDocuments.length === 0 ? '（未选择，默认全部知识型文档）' : selectedDocuments.map(id => {
              const doc = knowledgeDocuments.find(d => d.id === id);
              return doc ? doc.name : '';
            }).filter(Boolean).join('，')}
          </div>
          {/* 文档多选器 */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {knowledgeDocuments.map(doc => (
                <button
                  key={doc.id}
                  className={`px-2 py-1 rounded border text-xs ${selectedDocuments.includes(doc.id) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300'} transition`}
                  onClick={() => toggleSelectDocument(doc.id)}
                >
                  {doc.name}
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
                <p className="text-sm mt-2">例如：&quot;基于这些财务准则，我们的处理方式是否正确？&quot;</p>
                {selectedDocuments.length > 0 && (
                  <p className="text-xs mt-2 text-blue-600">
                    当前选中文档: {selectedDocuments.map(id => knowledgeDocuments.find(d => d.id === id)?.name).filter(Boolean).join('，')}
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending}
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !inputMessage.trim()}
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