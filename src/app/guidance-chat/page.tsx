"use client";
import React, { useState, useRef, useEffect } from "react";
import { useDocumentStore, Document } from "../../store/documents";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import { checkAndIncreaseApiLimit } from "../../lib/rateLimit";
import Link from "next/link";
import RichTextRenderer from "../../components/RichTextRenderer";
import DocumentSelectModal from "../../components/DocumentSelectModal";
import ChatInputArea from "../../components/ChatInputArea";
import { FiAlertTriangle, FiBarChart2, FiLink, FiBookOpen } from "react-icons/fi";

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responseData?: GuidanceResponse;
};

type Citation = {
  regulation: string;
  article: string;
  content: string;
  relevance: number;
};

type RelatedArticle = {
  regulation: string;
  article: string;
  summary: string;
};

type CalculationDetail = {
  functionName: string;
  functionDisplayName: string;
  formula: string;
  inputs: Record<string, { value: number; unit: string; source: string }>;
  result: {
    value: number;
    formatted: string;
  };
  description?: string;
};

type GuidanceResponse = {
  type: 'guidance' | 'not_found' | 'low_confidence';
  guidance?: string;
  citations: Citation[];
  confidence: number;
  relatedArticles?: RelatedArticle[];
  warnings?: string[];
  calculations?: CalculationDetail[];
};

// Preset questions
const presetQuestions = [
  "公司销售软件产品，应该适用什么增值税税率？",
  "关于数据资源入表，有哪些会计准则规定？",
  "小规模纳税人和一般纳税人的区别是什么？",
  "企业所得税的基本税率是多少？",
  "增值税专用发票和普通发票的区别？",
  "固定资产折旧的会计处理方法有哪些？"
];

const CitationCard = ({ citation, id }: { citation: Citation; id?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const relevancePercent = (citation.relevance * 100).toFixed(0);
  const relevanceColor = citation.relevance >= 0.8 ? 'text-green-600' : citation.relevance >= 0.6 ? 'text-yellow-600' : 'text-gray-600';

  return (
    <div id={id} className="border border-gray-300 rounded-lg p-3 bg-gray-50 transition-all duration-300">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blue-700">📖 {citation.regulation}</span>
          <span className="text-sm text-gray-600">{citation.article}</span>
        </div>
        <span className={`text-xs ${relevanceColor} font-medium`}>
          相关度: {relevancePercent}%
        </span>
      </div>

      {expanded && (
        <div className="mt-2 text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
          {citation.content}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
      >
        {expanded ? "收起条款内容" : "展开查看条款内容"}
      </button>
    </div>
  );
};

const CalculationCard = ({ calculation, id }: { calculation: CalculationDetail; id?: string }) => {
  return (
    <div id={id} className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded transition-all duration-300">
      <div className="mb-3">
        <div className="text-lg font-bold text-blue-900">
          {calculation.description || calculation.functionDisplayName}
        </div>
        <div className="text-sm text-gray-600 mt-1">{calculation.formula}</div>
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

export default function GuidanceChatPage() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Document Selection State
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);



  // Subscribe to store updates for new uploads
  const storeDocuments = useDocumentStore((s) => s.documents);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  // Load documents on mount
  useEffect(() => {
    loadAvailableDocuments();
    setSessionId(crypto.randomUUID());
  }, []);

  // Sync store documents with local state when store changes (e.g. after upload)
  useEffect(() => {
    // Merge store documents (which might have new uploads) with fetched documents
    // This is a simple way to ensure new uploads appear in the list
    if (storeDocuments.length > 0) {
      setAvailableDocuments(prev => {
        const prevIds = new Set(prev.map(d => d.id));
        const newDocs = storeDocuments.filter(d => !prevIds.has(d.id));
        return [...prev, ...newDocs];
      });
    }
  }, [storeDocuments]);

  const loadAvailableDocuments = async () => {
    try {
      // Fetch all documents (knowledge + business)
      // We don't filter by type strictly here, relying on docCategory
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        const docs: Document[] = data.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type || 'unknown',
          docCategory: doc.doc_category || 'business',
          uploadTime: doc.created_at || new Date().toISOString(),
          status: "ready",
          size: 0,
          summary: {
            document_type: doc.type,
            summary: '',
            key_metrics: [],
            time_period: ''
          }
        }));
        setAvailableDocuments(docs);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };



  const handleSendMessage = async (message: string) => {
    if (!message.trim() || loading) return;

    // Validation: Must select at least one knowledge document
    const selectedDocs = availableDocuments.filter(d => selectedDocIds.includes(d.id));
    const hasKnowledgeDoc = selectedDocs.some(d => d.docCategory === 'knowledge');

    if (!hasKnowledgeDoc) {
      alert("请至少选择一个法规库文档（数据库文档）作为分析依据");
      setShowDocModal(true);
      return;
    }

    if (!checkAndIncreaseApiLimit(10)) {
      alert("今日体验次数已达上限，请明天再试或联系作者获取更多体验权限。");
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/guidance-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: message,
          documentIds: selectedDocIds,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data: GuidanceResponse & { sessionId?: string } = await response.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.guidance || "抱歉，我无法回答这个问题。",
        timestamp: new Date().toISOString(),
        responseData: data
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 2}`,
        role: 'assistant',
        content: "抱歉，处理您的问题时遇到了错误。请稍后再试。",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };





  const renderAssistantMessage = (msg: ChatMessage) => {
    const data = msg.responseData;

    if (!data) {
      return <div className="text-gray-700 whitespace-pre-wrap">{msg.content}</div>;
    }

    return (
      <div className="w-full space-y-4">
        {data.guidance && (
          <RichTextRenderer
            content={data.guidance}
            onCitationClick={(index) => {
              const citationCard = document.getElementById(`citation-card-${msg.id}-${index}`);
              if (citationCard) {
                citationCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                citationCard.classList.add('ring-2', 'ring-yellow-400');
                setTimeout(() => citationCard.classList.remove('ring-2', 'ring-yellow-400'), 2000);
              }
            }}
          />
        )}

        {data.type === 'not_found' && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <FiAlertTriangle className="text-yellow-600 text-lg" />
              <div className="flex-1">
                <div className="font-semibold text-yellow-800 mb-1">未找到相关法规</div>
                <div className="text-sm text-yellow-700">
                  我在选定的文档库中未找到与您的问题直接相关的规定。
                </div>
              </div>
            </div>
          </div>
        )}

        {data.citations && data.citations.length > 0 && (
          <div className="space-y-2">
            <div className="font-semibold text-gray-800 flex items-center gap-2">
              <FiBookOpen />
              <span>参考依据 ({data.citations.length})</span>
            </div>
            {data.citations.map((citation, idx) => (
              <CitationCard
                key={idx}
                citation={citation}
                id={`citation-card-${msg.id}-${idx + 1}`}
              />
            ))}
          </div>
        )}

        {data.calculations && data.calculations.length > 0 && (
          <div className="space-y-3">
            <div className="font-semibold text-gray-800 flex items-center gap-2">
              <FiBarChart2 />
              <span>计算过程 ({data.calculations.length})</span>
            </div>
            {data.calculations.map((calc, idx) => (
              <CalculationCard
                key={idx}
                calculation={calc}
                id={`calc-card-${msg.id}-${idx}`}
              />
            ))}
          </div>
        )}

        {data.warnings && data.warnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <FiAlertTriangle />
              <span>重要提示</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {data.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.relatedArticles && data.relatedArticles.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FiLink />
              <span>相关条款</span>
            </div>
            <div className="space-y-2">
              {data.relatedArticles.map((article, idx) => (
                <div key={idx} className="text-sm bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="font-medium text-blue-800">
                    {article.regulation} {article.article}
                  </div>
                  <div className="text-gray-600 mt-1">{article.summary}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3 mt-4">
          <div className="font-semibold mb-1">免责声明</div>
          <div>
            本建议基于现有法规库，仅供参考。具体情况可能涉及更复杂的法律问题，建议咨询专业税务或法务顾问以获取针对性建议。
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col h-[calc(100vh-110px)] gap-0">
        <section className="w-full">
          <PageTitle>财务合规指导</PageTitle>
          <p className="mb-2 text-gray-700">
            基于税务法规和会计准则，提供专业的合规性分析和建议。请选择相关法规库文档，并可上传业务文档进行对照分析。
          </p>
          <p className="mb-4 text-gray-700">
            仍有疑问？请在
            <Link href="/about#faq" className="text-yellow-500 underline hover:text-yellow-400 transition-colors ml-1">关于/帮助</Link>
            页面获取指引，或跳转查看
            <Link href="/showcase#guidance" className="text-yellow-500 underline hover:text-yellow-400 transition-colors ml-1">演示案例</Link>。
          </p>

          <DocumentSelectModal
            open={showDocModal}
            onClose={() => setShowDocModal(false)}
            mode="multiple"
            categories={['knowledge', 'business']}
            selectedIds={selectedDocIds}
            onSelect={setSelectedDocIds}
            documents={availableDocuments}
            showUpload={true}
          />
        </section>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto bg-white rounded-lg p-4 mb-4" style={{ minHeight: 320 }}>
          <div className="flex flex-col gap-4">
            {chatMessages.length === 0 && !loading && (
              <div className="text-gray-400 text-center mt-10">
                {selectedDocIds.length === 0
                  ? "请先点击左下角按钮选择法规库文档..."
                  : "请输入您的合规性问题，或使用下方的预设问题快速开始"}
              </div>
            )}

            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.role === "user"
                    ? "self-end bg-yellow-100 text-black rounded-lg px-4 py-3 max-w-[80%]"
                    : "w-full"
                }
              >
                {msg.role === "assistant"
                  ? (
                    <div className="bg-gray-100 rounded-lg p-4">
                      {renderAssistantMessage(msg)}
                    </div>
                  )
                  : <span className="whitespace-pre-wrap">{msg.content}</span>
                }
              </div>
            ))}

            {loading && (
              <div className="w-full text-center">
                <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
                  <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">正在分析法规...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInputArea
          input={input}
          setInput={setInput}
          onSend={handleSendMessage}
          loading={loading}
          disabled={selectedDocIds.length === 0}
          placeholder={selectedDocIds.length === 0 ? "请先选择法规库文档..." : "请输入您的合规性问题..."}
          onDocumentSelect={() => setShowDocModal(true)}
          selectedDocCount={selectedDocIds.length}
          presetQuestions={presetQuestions}
          onPresetSelect={(q) => {
            // We need to implement a way to set input or send directly
            // ChatInputArea handles text insertion internal to itself via refs if we moved logic there?
            // Actually ChatInputArea takes onPresetSelect and we want it to insert text.
            // But ChatInputArea has the textarea ref.
            // Let's look at ChatInputArea again.
            // It calls onPresetSelect? No, it handles handlePresetClick internally and calls setInput.
            // Wait, ChatInputArea in my design handles the click and calls insertTextAtCursor which calls setInput.
            // The prop onPresetSelect is actually not used in the internal logic I wrote?
            // Let's check ChatInputArea.tsx content I just wrote.
            // `handlePresetClick` calls `insertTextAtCursor` which calls `setInput`.
            // It does NOT call `onPresetSelect` prop. 
            // So I don't need to pass a complex logic here, just a dummy or remove the prop from interface if unused?
            // Currently defined interface has `onPresetSelect`.
            // I should probably update ChatInputArea to use the prop or remove it.
            // Ideally the parent might want to know? Or maybe just for tracking.
            // For now let's pass a no-op or simple log.
            console.log("Preset selected:", q);
          }}
        />
      </div>
    </PageContainer>
  );
}
