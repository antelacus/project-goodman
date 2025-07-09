"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useDocumentStore, Document } from "../../store/documents";
import DocumentManager from "../../components/DocumentManager";
import Link from "next/link";
import HighlightLatex from "../../components/HighlightLatex";
import LatexCalcModal from "../../components/LatexCalcModal";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import ReactMarkdown from "react-markdown";
import { evaluate } from "mathjs";
import "katex/dist/katex.min.css";
import { getGuidanceChatPrompt } from "../../lib/prompts";
import { complianceGuidancePresets } from "../../lib/presetQuestions";
import ChatInputBox from "../../components/ChatInputBox";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";

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
  const isLoading = useDocumentStore((s) => s.isLoading);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const loadDocumentsFromJsonDir = useDocumentStore((s) => s.loadDocumentsFromJsonDir);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedKnowledgeDocs, setSelectedKnowledgeDocs] = useState<string[]>([]);
  const [selectedBusinessDocs, setSelectedBusinessDocs] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLatex, setModalLatex] = useState('');
  const [modalParsed, setModalParsed] = useState('');
  const [modalResult, setModalResult] = useState('');
  const [modalError, setModalError] = useState<string | undefined>(undefined);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'unsupported'>('idle');
  const [streamedContent, setStreamedContent] = useState(""); // 当前逐字输出内容

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

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
  };

  const processExcel = async (file: File): Promise<string> => {
    if (typeof window === "undefined") return "";
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    let fullText = "";

    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      fullText += `工作表: ${sheetName}\n`;
      jsonData.forEach((row: any) => {
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
    if (!file.type.includes('pdf')) {
      setUploadStatus('unsupported');
      return;
    }
    setUploadStatus('uploading');
    setIsProcessing(true);
    try {
      const text = await processFile(file);
      const documentId = `business-${Date.now()}`;
      const response = await fetch("/api/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, documentId, fileName: file.name }),
      });
      if (!response.ok) throw new Error("文档处理失败");
      const result = await response.json();
      const newDocument: Document = {
        id: documentId,
        name: file.name,
        type: 'pdf',
        docCategory: "business",
        uploadTime: new Date().toISOString(),
        status: "ready",
        size: file.size,
        summary: result.summary,
        chunks: result.chunks
      };
      addDocument(newDocument);
      setSelectedBusinessDocs(prev => [...prev, documentId]);
      setUploadStatus('success');
    } catch (error) {
      setUploadStatus('error');
      alert("文件处理失败，请重试");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setUploadStatus('idle'), 2000);
    }
  }, [processFile, addDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  function getUploadStatusMessage() {
    switch (uploadStatus) {
      case 'uploading': return '上传中...';
      case 'unsupported': return '文件类型不支持';
      case 'success': return '上传完毕';
      case 'error': return '上传失败';
      default: return '请在此处上传业务型PDF文件';
    }
  }

  const handleSendMessage = async (msg: string) => {
    if (!msg.trim() || isSending) return;

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
    setStreamedContent("");

    try {
      // 获取选中的业务型文档内容
      const selectedBusinessDocsData = businessDocuments.filter(doc => 
        selectedBusinessDocs.includes(doc.id)
      );

      // 构建与财务分析与预测一致的prompt
      const prompt = getGuidanceChatPrompt(
        selectedKnowledgeDocs.map(id => knowledgeDocuments.find(d => d.id === id)?.name || "").filter(Boolean),
        selectedBusinessDocsData.map(doc => doc.name)
      );

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: `${prompt}\n用户问题：${userMessage.content}`,
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
        setStreamedContent(aiContent.slice(0, idx));
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
          setStreamedContent("");
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

  // LaTeX解析与校验逻辑
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

  // 高亮并可交互的Markdown渲染
  function renderMarkdownWithLatexHighlight(content: string) {
    // 匹配$...$和$$...$$表达式
    const inline = /\$(.+?)\$/g;
    const block = /\$\$(.+?)\$\$/g;
    let parts: (string | { latex: string })[] = [];
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
          <PageTitle>合规性指导</PageTitle>
          <p className="text-gray-700 mb-6">本页面可结合知识型和业务型文档，AI自动判断业务处理是否符合相关法规、准则，提供合规性分析和建议。</p>
          {/* 对话消息区 */}
          <div className="bg-white rounded-lg p-4 mb-6 flex-1 overflow-y-auto" style={{ minHeight: 320 }}>
            <div className="flex flex-col gap-4">
              {chatMessages.length === 0 && !isSending && (
                <div className="text-gray-400 text-center mt-10">请在下方输入你的问题</div>
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