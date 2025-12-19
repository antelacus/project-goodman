"use client";
import React, { useState, useRef, useEffect } from "react";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import { checkAndIncreaseApiLimit } from "../../lib/rateLimit";
import Link from "next/link";
import DocumentSelectModal from "../../components/DocumentSelectModal"; // 保持原有手动选择组件供参考
import { DocumentSourceDisplay, SelectedDocumentInfo } from "../../components/DocumentSourceDisplay";
import { DocumentSelectionModal } from "../../components/DocumentSelectionModal";
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
  // 为每条消息记录使用的文档选择信息
  documentSelection?: {
    mode: 'auto' | 'manual';
    selectedDocuments: SelectedDocumentInfo[];
  };
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
  // 新增：后端返回的文档选择详情
  documentSelection?: {
    mode: 'auto' | 'manual';
    selectedDocuments: Array<{
      documentId: string;
      documentName: string;
      relevanceScore: number;
      selectionReason?: string;
      year?: number;
    }>;
  };
};

export default function FinancialAnalysisPage() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);

  // 核心状态：文档选择配置
  const [selectionMode, setSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [manualSelectedDocIds, setManualSelectedDocIds] = useState<string[]>([]);

  // 弹窗控制
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [pendingModalState, setPendingModalState] = useState<{
    messageId?: string; // 如果是针对某条消息的“修改”，记录消息ID
    currentMode: 'auto' | 'manual';
    currentSelection: SelectedDocumentInfo[];
    autoRecommended: SelectedDocumentInfo[];
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  useEffect(() => {
    loadAvailableDocuments();
  }, []);

  const loadAvailableDocuments = async () => {
    try {
      const res = await fetch("/api/documents?type=balance_sheet,income_statement,cash_flow");
      if (res.ok) {
        const data = await res.json();
        const docs: Document[] = data.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: 'excel',
          docCategory: 'knowledge',
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
        const readyDocs = docs.filter(d => d.status === 'ready');
        setAvailableDocuments(readyDocs);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  const presetQuestions = [
    "2024年的资产负债率是多少？",
    "计算流动比率",
    "公司的净资产收益率(ROE)是多少？",
    "营业收入增长率如何？",
    "分析公司的偿债能力",
    "计算销售毛利率",
  ];

  // 为本次对话（如果不关联特定历史消息）打开设置
  const openGlobalSelectionModal = () => {
    // 全局设置：如果没有发生过对话，则可以预设
    // 但通常用户是在看到结果后想修改。
    // 这里我们让左下角的按钮打开“手动选择”模式，为了兼容习惯，
    // 但更好的做法是引导用户使用 Auto 或 Manual。
    // 目前左下角按钮主要用于“手动指定范围”。
    setPendingModalState({
      currentMode: selectionMode,
      currentSelection: manualSelectedDocIds.map(id => {
        const doc = availableDocuments.find(d => d.id === id);
        return {
          documentId: id,
          documentName: doc?.name || 'Unknown Document'
        };
      }),
      autoRecommended: [] // 全局设置时没有“上一次自动推荐”
    });
    setShowSelectionModal(true);
  };

  // 针对特定消息结果的“修改选择”
  const handleModifySelection = (msg: ChatMessage) => {
    if (!msg.documentSelection) return;

    // 如果是 Auto 模式，我们需要传入后端的推荐结果作为 autoRecommended
    const autoRec = msg.responseData?.documentSelection?.selectedDocuments || [];
    const formattedAutoRec: SelectedDocumentInfo[] = autoRec.map(d => ({
      ...d,
      year: d.year
    }));

    setPendingModalState({
      messageId: msg.id,
      currentMode: msg.documentSelection.mode,
      currentSelection: msg.documentSelection.selectedDocuments,
      autoRecommended: formattedAutoRec
    });
    setShowSelectionModal(true);
  };

  const handleConfirmSelection = (mode: 'auto' | 'manual', selectedIds: string[]) => {
    // 如果是针对某条消息的修改（重新生成）
    if (pendingModalState?.messageId) {
      // 找到原问题
      const originalMsgIndex = chatMessages.findIndex(m => m.id === pendingModalState.messageId);
      if (originalMsgIndex > 0) {
        const questionMsg = chatMessages[originalMsgIndex - 1]; // 假设前一条是问题
        if (questionMsg.role === 'user') {
          // 重新发送请求，强制使用新的选择配置
          // 我们需要一种方式告诉 sendMessage "这是一个重新生成请求，覆盖即时设置"
          // 这里简化处理：直接调用 sendMessage，并在该函数中支持 override 参数
          sendMessage(questionMsg.content, {
            overrideMode: mode,
            overrideIds: selectedIds
          });
        }
      }
    } else {
      // 全局设置更新
      setSelectionMode(mode);
      setManualSelectedDocIds(selectedIds);
    }
    setShowSelectionModal(false);
    setPendingModalState(null);
  };

  const sendMessage = async (
    msg: string,
    options?: { overrideMode?: 'auto' | 'manual'; overrideIds?: string[] }
  ) => {
    if (!msg.trim() || isSending) return;

    // 确定本次请求的模式
    const mode = options?.overrideMode || selectionMode;
    const docIds = options?.overrideIds || manualSelectedDocIds;

    // 如果是手动模式且未选择文档，提示用户
    if (mode === 'manual' && docIds.length === 0) {
      alert("手动模式下，请先选择需要分析的文档，或切换为自动模式。");
      openGlobalSelectionModal();
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
      const payload = {
        question: msg,
        // 如果是 manual，传 documentIds；如果是 auto，则 autoSelect: { enabled: true }
        // 也可以两者结合：后端逻辑是 "如果 autoSelect.enabled=true，则 documentIds 被视为 '指定范围' 还是 '忽略'?"
        // 根据设计文档：
        // documentIds?: string[]; // 可选，手动指定
        // autoSelect?: { enabled: boolean; ... };
        documentIds: mode === 'manual' ? docIds : undefined,
        autoSelect: {
          enabled: mode === 'auto',
          maxDocuments: 5
        }
      };

      const res = await fetch("/api/financial-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("AI回复失败");
      }

      const responseData: FinancialAnalysisResponse = await res.json();

      // 构建文档选择信息供前端显示
      let docSelectionInfo: ChatMessage['documentSelection'];

      if (responseData.documentSelection) {
        // 使用后端返回的完整选择信息
        docSelectionInfo = {
          mode: responseData.documentSelection.mode,
          selectedDocuments: responseData.documentSelection.selectedDocuments.map(d => ({
            documentId: d.documentId,
            documentName: d.documentName,
            relevanceScore: d.relevanceScore,
            selectionReason: d.selectionReason,
            year: d.year
          }))
        };
      } else if (mode === 'manual') {
        // 兼容旧后端或手动模式兜底
        docSelectionInfo = {
          mode: 'manual',
          selectedDocuments: docIds.map(id => {
            const doc = availableDocuments.find(d => d.id === id);
            return { documentId: id, documentName: doc?.name || 'Unknown' };
          })
        };
      }

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: responseData.answer || "抱歉，我无法处理这个问题。",
        timestamp: new Date().toISOString(),
        responseData,
        documentSelection: docSelectionInfo
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

  const renderAssistantMessage = (msg: ChatMessage) => {
    return (
      <div className="w-full">
        <div className="bg-gray-100 rounded-lg p-4">
          {/* 文档来源显示组件 */}
          {msg.documentSelection && (
            <div className="mb-4">
              <DocumentSourceDisplay
                mode={msg.documentSelection.mode}
                selectedDocuments={msg.documentSelection.selectedDocuments}
                onModify={() => handleModifySelection(msg)}
              />
            </div>
          )}

          <RichTextRenderer
            content={msg.content}
            onCalculationClick={(metric) => {
              const calcCard = document.getElementById(`calc-card-${msg.id}`);
              if (calcCard) {
                calcCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                calcCard.classList.add('ring-2', 'ring-yellow-400');
                setTimeout(() => calcCard.classList.remove('ring-2', 'ring-yellow-400'), 2000);
              }
            }}
            onSourceClick={() => {
              // 这里的 SourceClick 原本是跳转到底部的 source list，
              // 现在有了 DocumentSourceDisplay，也许可以统一。
              // 暂时保留旧行为，如果有 Calculation Card 的话。
            }}
          />

          {msg.responseData?.type === "calculation_result" && msg.responseData.calculation && (
            // Calculation Card (Reuse existing logic inline or component)
            <div id={`calc-card-${msg.id}`} className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded transition-all duration-300">
              <div className="mb-3">
                <div className="text-lg font-bold text-blue-900">{msg.responseData.calculation.functionDisplayName}</div>
                <div className="text-sm text-gray-600 mt-1">{msg.responseData.calculation.formula}</div>
              </div>

              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-700 mb-2">计算步骤:</div>
                <ol className="list-decimal list-inside space-y-1">
                  {msg.responseData.calculation.steps.map((step, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="p-3 bg-white border border-blue-300 rounded">
                <div className="text-sm text-gray-600">计算结果</div>
                <div className="text-2xl font-bold text-blue-600">
                  {msg.responseData.calculation.result.formatted}
                </div>
              </div>
            </div>
          )}

          {msg.responseData?.type === "insufficient_data" && msg.responseData.missingData && (
            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <div className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-1"><FiAlertTriangle className="inline" /> 缺少必要数据:</div>
              <ul className="list-disc list-inside space-y-1">
                {msg.responseData.missingData.map((item, idx) => (
                  <li key={idx} className="text-sm text-yellow-800">{item}</li>
                ))}
              </ul>
              {msg.responseData.suggestion && (
                <div className="mt-3 text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                  <HiOutlineLightBulb className="inline mr-1" />{msg.responseData.suggestion}
                </div>
              )}
            </div>
          )}

          {msg.responseData && msg.responseData.confidence !== undefined && (
            <div className="mt-3 text-xs text-gray-500">
              置信度: {(msg.responseData.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col h-[calc(100vh-110px)] gap-0">
        <section className="w-full">
          <PageTitle>财务指标分析</PageTitle>
          <p className="mb-2 text-gray-700">
            使用AI智能分析系统，基于数据库中的财务报表自动计算财务指标。系统会自动智能筛选文档，您也可以手动指定。
          </p>
          <p className="mb-4 text-gray-700">
            <span className="text-sm text-gray-500">当前模式: </span>
            <span className={`text-sm font-bold ${selectionMode === 'auto' ? 'text-purple-600' : 'text-blue-600'}`}>
              {selectionMode === 'auto' ? '✨ AI 自动精选' : `👆 人工指定 (${manualSelectedDocIds.length} docs)`}
            </span>
            <button onClick={openGlobalSelectionModal} className="ml-2 text-xs underline text-gray-500 hover:text-black">
              更改设置
            </button>
          </p>

          {/* New Selection Modal */}
          {pendingModalState && (
            <DocumentSelectionModal
              open={showSelectionModal}
              onClose={() => setShowSelectionModal(false)}
              currentMode={pendingModalState.currentMode}
              currentSelection={pendingModalState.currentSelection}
              autoRecommended={pendingModalState.autoRecommended}
              onConfirm={handleConfirmSelection}
            />
          )}

        </section>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto bg-white rounded-lg p-4 mb-4" style={{ minHeight: 320 }}>
          <div className="flex flex-col gap-4">
            {chatMessages.length === 0 && !isSending && (
              <div className="text-gray-400 text-center mt-10">
                <p>请输入您的财务分析问题，例如询问某个财务指标。</p>
                <p className="text-sm mt-2">
                  {selectionMode === 'auto'
                    ? "✨ AI 将自动从知识库中检索相关报表进行分析。"
                    : "👆 将基于您选定的文档进行分析。"}
                </p>
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
                  <span className="text-gray-600">AI 正在{selectionMode === 'auto' ? '检索文档并' : ''}思考中...</span>
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
          onSend={() => sendMessage(inputMessage)}
          loading={isSending}
          // 如果是Auto模式，不需要强制选择文档；如果是Manual模式且未选，则Disable
          disabled={selectionMode === 'manual' && manualSelectedDocIds.length === 0}
          placeholder={
            selectionMode === 'manual' && manualSelectedDocIds.length === 0
              ? "请先选择待分析文档..."
              : "请输入您的财务分析问题..."
          }
          onDocumentSelect={openGlobalSelectionModal} // 复用按钮打开新的 Modal
          selectedDocCount={manualSelectedDocIds.length} // 仅在 Manual 模式显式显示数量
          presetQuestions={presetQuestions}
          onPresetSelect={(q) => console.log('Preset click tracked:', q)}
        />
      </div>
    </PageContainer>
  );
}
