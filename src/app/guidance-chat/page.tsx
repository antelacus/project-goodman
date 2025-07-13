"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDocumentStore, Document } from "../../store/documents";
import HighlightLatex from "../../components/HighlightLatex";
import LatexCalcModal from "../../components/LatexCalcModal";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import ReactMarkdown from "react-markdown";
import { evaluate } from "mathjs";
import "katex/dist/katex.min.css";

import { complianceGuidancePresets } from "../../lib/presetQuestions";
import ChatInputBox from "../../components/ChatInputBox";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import { checkAndIncreaseApiLimit } from "../../lib/rateLimit";
import Link from "next/link";

// Set up the worker source for pdfjs-dist
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  streaming?: boolean; // 新增，标记AI回复是否正在逐字输出
};

export default function KnowledgeChatPage() {
  const documents = useDocumentStore((s) => s.documents);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedKnowledgeDocs, setSelectedKnowledgeDocs] = useState<string[]>([]);
  const [selectedBusinessDocs, setSelectedBusinessDocs] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLatex, setModalLatex] = useState('');
  const [modalParsed, setModalParsed] = useState('');
  const [modalResult, setModalResult] = useState('');
  const [modalError, setModalError] = useState<string | undefined>(undefined);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // 获取知识型文档
  const knowledgeDocuments = documents.filter(doc => doc.docCategory === "knowledge");
  const businessDocuments = documents.filter(doc => doc.docCategory === "business");

  // 高亮并可交互的Markdown渲染
  function renderMarkdownWithLatexHighlight(content: string) {
    // 匹配$...$和$$...$$表达式，支持$符号单独占行
    const inline = /\$\s*([\s\S]+?)\s*\$/g;
    const block = /\$\$\s*([\s\S]+?)\s*\$\$/g;
    const parts: (string | { latex: string })[] = [];
    let lastIdx = 0;
    // 先处理块级
    content.replace(block, (m: string, p1: string, offset: number) => {
      if (offset > lastIdx) parts.push(content.slice(lastIdx, offset));
      parts.push({ latex: p1 });
      lastIdx = offset + m.length;
      return m;
    });
    content = content.slice(lastIdx);
    lastIdx = 0;
    // 再处理行内
    content.replace(inline, (m: string, p1: string, offset: number) => {
      if (offset > lastIdx) parts.push(content.slice(lastIdx, offset));
      parts.push({ latex: p1 });
      lastIdx = offset + m.length;
      return m;
    });
    if (lastIdx < content.length) parts.push(content.slice(lastIdx));
    // 渲染
    return parts.map((part, i) => {
      if (typeof part === 'string') {
        return <ReactMarkdown key={i} remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{part}</ReactMarkdown>;
      } else {
        return (
          <HighlightLatex key={i} onClick={() => {
            setModalLatex(part.latex);
            const { expr, error } = parseLatexToMath(part.latex);
            setModalParsed(expr);
            if (!error) {
              try {
                const result = evaluate(expr);
                // 格式化：保留两位小数，千分位，百分号
                const resultNum = Number(result);
                let formatted = isNaN(resultNum)
                  ? result.toString()
                  : resultNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                // 若原始表达式含%或*100，自动加%
                if (/[％%]|\\times\s*100|\*100/.test(part.latex)) {
                  formatted += '%';
                }
                setModalResult(formatted);
                setModalError(undefined);
              } catch {
                setModalResult('');
                setModalError('计算失败');
              }
            } else {
              setModalResult('');
              setModalError(error);
            }
            setModalOpen(true);
          }}>{`$${part.latex}$`}</HighlightLatex>
        );
      }
    });
  }

  // 恢复parseLatexToMath函数定义
  function parseLatexToMath(latex: string): { expr: string, error?: string } {
    let expr = latex.trim();
    try {
      expr = expr.replace(/\\text\{[^{}]*\}/g, '');
      expr = expr.replace(/\\left|\\right/g, '');
      while (/\\frac\{[^{}]+\}\{[^{}]+\}/.test(expr)) {
        expr = expr.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
      }
      expr = expr.replace(/\\times/g, '*');
      expr = expr.replace(/\\div/g, '/');
      expr = expr.replace(/([\d,.]+)\s*%/g, '($1/100)');
      expr = expr.replace(/,/g, '');
      expr = expr.replace(/\$/g, '').replace(/\s+/g, '');
      if (!/^[-+*/().\d]+$/.test(expr)) {
        const match = expr.match(/([-+*/().\d]+)/);
        if (match) {
          expr = match[1];
        } else {
          return { expr, error: '暂不支持自动校验此类表达式' };
        }
      }
      return { expr };
    } catch {
      return { expr, error: '解析表达式失败' };
    }
  }

  // 恢复handleSendMessage函数定义
  const handleSendMessage = async (msg: string) => {
    if (!msg.trim() || isSending) return;
    if (!checkAndIncreaseApiLimit(10)) {
      alert("今日体验次数已达上限，请明天再试或联系作者获取更多体验权限。");
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    // 先插入一条空的 assistant 消息，streaming: true
    const aiMsgId = `msg-${Date.now() + 1}`;
    setChatMessages(prev => [
      ...prev,
      { role: "assistant", content: "", timestamp: new Date().toISOString(), streaming: true }
    ]);

    try {
      // 获取选中的业务型文档内容
      const selectedBusinessDocsData = businessDocuments
        .filter(doc => selectedBusinessDocs.includes(doc.id))
        .map(doc => {
          // 保证chunks存在且为数组，且有text字段
          let chunks = Array.isArray(doc.chunks) && doc.chunks.length > 0
            ? doc.chunks
            : (doc.summary?.summary ? [{ id: 'chunk-0', text: doc.summary.summary, embedding: [], chunkIndex: 0 }] : []);
          return {
            ...doc,
            summary: doc.summary || { document_type: '', summary: '', key_metrics: [], time_period: '' },
            chunks,
          };
        });

      const response = await fetch("/api/guidance-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage.content,
          documentIds: selectedKnowledgeDocs,
          chatHistory: chatMessages,
          businessDocuments: selectedBusinessDocsData
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      // 自动将[ ... ]替换为$$...$$
      let aiContent = data.response;
      aiContent = aiContent.replace(/\[([^\[]+?)\]/g, (m: string, p1: string) => `$$${p1}$$`);
      // 逐字输出
      let idx = 0;
      const typeInterval = 18; // ms
      function typeNext() {
        idx++;
        setChatMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.role === "assistant" && m.streaming ? { ...m, content: aiContent.slice(0, idx) } : m
        ));
        if (idx < aiContent.length) {
          setTimeout(typeNext, typeInterval);
        } else {
          // 输出完毕，标记为已完成
          setChatMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 && m.role === "assistant" && m.streaming ? { ...m, streaming: false } : m
          ));
        }
      }
      typeNext();
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

  const handleSelectDocs = (ids: string[]) => {
    // 按照文档类型分配
    setSelectedKnowledgeDocs(ids.filter(id => knowledgeDocuments.some(d => d.id === id)));
    setSelectedBusinessDocs(ids.filter(id => businessDocuments.some(d => d.id === id)));
  };

  const selectedDocs = [
    ...selectedKnowledgeDocs.map(id => {
      const doc = knowledgeDocuments.find(d => d.id === id);
      return doc ? { id: doc.id, name: doc.name } : null;
    }),
    ...selectedBusinessDocs.map(id => {
      const doc = businessDocuments.find(d => d.id === id);
      return doc ? { id: doc.id, name: doc.name } : null;
    })
  ].filter(Boolean) as { id: string, name: string }[];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageContainer maxWidth="3xl">
      <div className="flex flex-col h-[calc(100vh-64px)] gap-0"> {/* 64px 预留顶部导航高度，可根据实际调整 */}
        <section className="w-full flex-1 flex flex-col gap-0">
          <PageTitle>财务合规指导</PageTitle>
          <p className="mb-2 text-gray-700">
          本页面可结合财务数据库文档，使用 AI 回答待处理文档相关财务问题，或判断相关财务处理是否符合法规、准则、制度，并提供合规性分析和建议。<br />
          </p>
          <p className="mb-2 text-gray-700">
            仍有疑问？请在
              <Link href="/about" className="text-yellow-500 underline hover:text-yellow-400 transition-colors">关于/帮助</Link>
              页面获取指引，或跳转查看
            <Link href="/showcase#guidance" className="text-yellow-500 underline hover:text-yellow-400 transition-colors">演示案例</Link>。
          </p>
          {/* 对话消息区 */}
          <div className="bg-white rounded-lg p-4 mb-6 flex-1 overflow-y-auto" style={{ minHeight: 320 }}>
            <div className="flex flex-col gap-4">
              {chatMessages.length === 0 && !isSending && (
                <div className="text-gray-400 text-center mt-10">请在选择数据库文档和待处理文档后，输入并发送你的问题。可使用内置的“预设提问”</div>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={
                    msg.role === "user"
                      ? "self-end bg-gray-100 text-black rounded px-4 py-2 max-w-[80%]"
                      : "w-full bg-white text-black px-0 py-2"
                  }
                  style={msg.role === "assistant" ? { width: "100%" } : {}}
                >
                  {msg.role === "assistant"
                    ? (msg.streaming
                        ? <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                        : renderMarkdownWithLatexHighlight(msg.content)
                      )
                    : <span>{msg.content}</span>
                  }
                </div>
              ))}
              {isSending && (
                <div className="w-full text-center text-gray-400">回答中...</div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
          <LatexCalcModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            latex={modalLatex}
            parsedExpr={modalParsed}
            calcResult={modalResult}
            error={modalError}
          />
        </section>
        {/* 输入区吸底 */}
        <div className="sticky bottom-0 bg-white pt-2 pb-4 z-10 border-t border-gray-200">
          <ChatInputBox
            selectedDocs={selectedDocs}
            onSelectDocs={handleSelectDocs}
            docSelectMode="multiple"
            docCategories={["knowledge", "business"]}
            showUpload={true}
            presetQuestions={complianceGuidancePresets}
            onSend={handleSendMessage}
            sendDisabled={selectedKnowledgeDocs.length === 0 || selectedBusinessDocs.length === 0 || isSending}
            sendDisabledTip="请选择至少一个知识型和业务型文档"
            sendBtnText={isSending ? "发送中..." : "发送"}
            inputPlaceholder="请输入你的合规性问题..."
          />
        </div>
      </div>
    </PageContainer>
  );
} 