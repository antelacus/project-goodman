"use client";
import React, { useState, useRef, useEffect } from "react";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import { checkAndIncreaseApiLimit } from "../../lib/rateLimit";
import Link from "next/link";
import DocumentSelectModal from "../../components/DocumentSelectModal";
import { Document } from "../../store/documents";
import RichTextRenderer from "../../components/RichTextRenderer";
import { FiAlertTriangle, FiLoader, FiFileText } from "react-icons/fi";
import ChatInputArea from "../../components/ChatInputArea";
import { HiOutlineLightBulb } from "react-icons/hi";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  responseData?: FinancialAnalysisResponse;
};

type FinancialAnalysisResponse = {
  type: "calculation_result" | "insufficient_data" | "low_confidence" | "no_function";
  answer?: string;
  calculation?: {
    functionUsed: string;
    functionDisplayName: string;
    formula: string;
    inputs: {
      [paramName: string]: {
        value: number;
        unit: string;
        source: string;
      };
    };
    result: {
      value: number;
      formatted: string;
      unit: string;
    };
    steps: string[];
  };
  confidence: number;
  sourceDocuments?: Array<{
    id: string;
    name: string;
    year: string;
    period: string;
  }>;
  missingData?: string[];
  suggestion?: string;
};

// Replaced by Document type from store

export default function FinancialAnalysisPage() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  // Load available documents on mount
  useEffect(() => {
    loadAvailableDocuments();
  }, []);

  const loadAvailableDocuments = async () => {
    try {
      // Remove category filter to show all financial documents (business & knowledge)
      const res = await fetch("/api/documents?type=balance_sheet,income_statement,cash_flow");
      if (res.ok) {
        const data = await res.json();
        const docs: Document[] = data.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: 'excel', // Default to excel for financial reports
          docCategory: 'knowledge', // Force to knowledge for modal compatibility
          uploadTime: doc.created_at || new Date().toISOString(),
          status: doc.is_structured ? "ready" : "processing",
          size: 0,
          summary: {
            document_type: 'financial_report',
            summary: '',
            key_metrics: [],
            time_period: `${doc.year || ''} ${doc.period || ''}`
          }
        }));
        // Only show ready documents
        const readyDocs = docs.filter(d => d.status === 'ready');
        setAvailableDocuments(readyDocs);
        // Default select all? Or none? User said "Select at least one". Let's leave empty and let user select.
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  // Preset questions based on common financial metrics
  const presetQuestions = [
    "2024年的资产负债率是多少？",
    "计算流动比率",
    "公司的净资产收益率(ROE)是多少？",
    "营业收入增长率如何？",
    "分析公司的偿债能力",
    "计算销售毛利率",
  ];

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || isSending) return;

    if (selectedDocIds.length === 0) {
      alert("请先选择需要分析的文档");
      setShowDocModal(true);
      return;
    }

    if (!checkAndIncreaseApiLimit(10)) {
      alert("今日体验次数已达上限，请明天再试或联系作者获取更多体验权限。");
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsSending(true);

    try {
      const res = await fetch("/api/financial-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: msg,
          documentIds: selectedDocIds,
        }),
      });

      if (!res.ok) {
        throw new Error("AI回复失败");
      }

      const responseData: FinancialAnalysisResponse = await res.json();

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: responseData.answer || "抱歉，我无法处理这个问题。",
        timestamp: new Date().toISOString(),
        responseData,
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 2}`,
        role: "assistant",
        content: "抱歉，AI服务暂时不可用，请稍后重试。",
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };





  const renderCalculationCard = (calculation: FinancialAnalysisResponse["calculation"], msgId: string) => {
    if (!calculation) return null;

    return (
      <div id={`calc-card-${msgId}`} className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded transition-all duration-300">
        <div className="mb-3">
          <div className="text-lg font-bold text-blue-900">{calculation.functionDisplayName}</div>
          <div className="text-sm text-gray-600 mt-1">{calculation.formula}</div>
        </div>

        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-700 mb-2">计算步骤:</div>
          <ol className="list-decimal list-inside space-y-1">
            {calculation.steps.map((step, idx) => (
              <li key={idx} className="text-sm text-gray-700">{step}</li>
            ))}
          </ol>
        </div>

        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-700 mb-2">输入数据:</div>
          <div className="space-y-1">
            {Object.entries(calculation.inputs).map(([key, value]) => (
              <div key={key} className="text-sm text-gray-700">
                <span className="font-medium">{key}:</span> {value.value.toLocaleString()} {value.unit}
                <span className="text-gray-500 text-xs ml-2">({value.source})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-white border border-blue-300 rounded">
          <div className="text-sm text-gray-600">计算结果</div>
          <div className="text-2xl font-bold text-blue-600">
            {calculation.result.formatted}
          </div>
        </div>
      </div>
    );
  };

  const renderSourceDocuments = (sources: FinancialAnalysisResponse["sourceDocuments"], msgId: string) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div id={`source-list-${msgId}`} className="mt-3 p-3 bg-gray-50 rounded transition-all duration-300">
        <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1"><FiFileText className="inline" /> 数据来源:</div>
        <div className="space-y-1">
          {sources.map((doc, idx) => (
            <div key={idx} className="text-xs text-gray-700">
              • {doc.name} ({doc.year} - {doc.period})
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMissingData = (missingData?: string[], suggestion?: string) => {
    if (!missingData || missingData.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
        <div className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-1"><FiAlertTriangle className="inline" /> 缺少必要数据:</div>
        <ul className="list-disc list-inside space-y-1">
          {missingData.map((item, idx) => (
            <li key={idx} className="text-sm text-yellow-800">{item}</li>
          ))}
        </ul>
        {suggestion && (
          <div className="mt-3 text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
            <HiOutlineLightBulb className="inline mr-1" />{suggestion}
          </div>
        )}
      </div>
    );
  };

  const renderAssistantMessage = (msg: ChatMessage) => {
    const { content, responseData } = msg;

    return (
      <div className="w-full">
        <div className="bg-gray-100 rounded-lg p-4">
          <RichTextRenderer
            content={content}
            onCalculationClick={(_metric) => {
              // Find the calculation card and scroll to it
              const calcCard = document.getElementById(`calc-card-${msg.id}`);
              if (calcCard) {
                calcCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                calcCard.classList.add('ring-2', 'ring-yellow-400');
                setTimeout(() => calcCard.classList.remove('ring-2', 'ring-yellow-400'), 2000);
              }
            }}
            onSourceClick={(_docName) => {
              // Find the source list and scroll to it
              const sourceList = document.getElementById(`source-list-${msg.id}`);
              if (sourceList) {
                sourceList.scrollIntoView({ behavior: 'smooth', block: 'center' });
                sourceList.classList.add('ring-2', 'ring-yellow-400');
                setTimeout(() => sourceList.classList.remove('ring-2', 'ring-yellow-400'), 2000);
              }
            }}
          />

          {responseData?.type === "calculation_result" && (
            <>
              {renderCalculationCard(responseData.calculation, msg.id)}
              {renderSourceDocuments(responseData.sourceDocuments, msg.id)}
            </>
          )}

          {responseData?.type === "insufficient_data" && (
            <>
              {renderMissingData(responseData.missingData, responseData.suggestion)}
            </>
          )}

          {responseData && responseData.confidence !== undefined && (
            <div className="mt-3 text-xs text-gray-500">
              置信度: {(responseData.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col h-[calc(100vh-110px)] gap-0">
        {/* Header Section */}
        <section className="w-full">
          <PageTitle>财务指标分析</PageTitle>
          <p className="mb-2 text-gray-700">
            使用AI智能分析系统，基于数据库中的财务报表自动计算财务指标。系统会自动提取所需数据，执行精确计算，并提供详细的步骤说明。
          </p>
          <p className="mb-4 text-gray-700">
            仍有疑问？请在
            <Link href="/about#faq" className="text-yellow-500 underline hover:text-yellow-400 transition-colors ml-1">关于/帮助</Link>
            页面获取指引，或跳转查看
            <Link href="/showcase#analysis" className="text-yellow-500 underline hover:text-yellow-400 transition-colors ml-1">演示案例</Link>。
          </p>

          {/* Document Selection Modal */}
          <DocumentSelectModal
            open={showDocModal}
            onClose={() => setShowDocModal(false)}
            mode="multiple"
            categories={['knowledge']}
            selectedIds={selectedDocIds}
            onSelect={setSelectedDocIds}
            documents={availableDocuments}
            showUpload={false}
          />
        </section>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto bg-white rounded-lg p-4 mb-4" style={{ minHeight: 320 }}>
          <div className="flex flex-col gap-4">
            {chatMessages.length === 0 && !isSending && (
              <div className="text-gray-400 text-center mt-10">
                {selectedDocIds.length === 0
                  ? "请先点击左下角按钮选择需要分析的文档..."
                  : "请输入您的财务分析问题，例如询问某个财务指标，或使用下方的预设问题快速开始。"}
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.role === "user"
                    ? "self-end bg-yellow-100 text-black rounded-lg px-4 py-2 max-w-[70%]"
                    : "w-full"
                }
              >
                {msg.role === "assistant" ? (
                  renderAssistantMessage(msg)
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            ))}

            {isSending && (
              <div className="w-full text-center">
                <div className="inline-block bg-gray-100 rounded-lg px-6 py-3">
                  <span className="text-gray-600">正在分析计算...</span>
                  <FiLoader className="ml-2 animate-spin inline" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInputArea
          input={inputMessage}
          setInput={setInputMessage}
          onSend={sendMessage}
          loading={isSending}
          disabled={selectedDocIds.length === 0}
          placeholder={selectedDocIds.length === 0 ? "请先选择待分析文档..." : "请输入您的财务分析问题..."}
          onDocumentSelect={() => setShowDocModal(true)}
          selectedDocCount={selectedDocIds.length}
          presetQuestions={presetQuestions}
          onPresetSelect={(q) => console.log('Preset click tracked:', q)}
        />
      </div>
    </PageContainer>
  );
}
