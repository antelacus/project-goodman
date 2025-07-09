"use client";
import React, { useState, useRef, useEffect } from "react";
import { useDocumentStore } from "../../store/documents";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import HighlightLatex from "../../components/HighlightLatex";
import LatexCalcModal from "../../components/LatexCalcModal";
import { evaluate } from "mathjs";
import { financialAnalysisPresets } from "../../lib/presetQuestions";
import ChatInputBox from "../../components/ChatInputBox";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  streaming?: boolean; // 新增，标记AI回复是否正在逐字输出
};

function parseLatexToMath(latex: string): { expr: string, error?: string } {
  let expr = latex.trim();
  try {
    // 去除\text{...}
    expr = expr.replace(/\\text\{[^{}]*\}/g, '');
    // 去除\left和\right
    expr = expr.replace(/\\left|\\right/g, '');
    // 递归处理嵌套\frac
    while (/\\frac\{[^{}]+\}\{[^{}]+\}/.test(expr)) {
      expr = expr.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
    }
    // 替换\times为*
    expr = expr.replace(/\\times/g, '*');
    // 替换\div为/
    expr = expr.replace(/\\div/g, '/');
    // 替换百分号
    expr = expr.replace(/([\d,.]+)\s*%/g, '($1/100)');
    // 去除千分号逗号
    expr = expr.replace(/,/g, '');
    // 去除$和多余空格
    expr = expr.replace(/\$/g, '').replace(/\s+/g, '');
    // 只允许数字、运算符、括号
    if (!/^[-+*/().\d]+$/.test(expr)) {
      // 尝试只提取第一个合法算式（支持括号嵌套）
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

export default function FinancialAnalysisPage() {
  const documents = useDocumentStore((s) => s.documents);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const knowledgeDocs = documents.filter(doc => doc.docCategory === "knowledge");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLatex, setModalLatex] = useState('');
  const [modalParsed, setModalParsed] = useState('');
  const [modalResult, setModalResult] = useState('');
  const [modalError, setModalError] = useState<string | undefined>(undefined);
  const [presetOpen, setPresetOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // 多选文档切换
  const toggleSelectDocument = (docId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  // 高亮并可交互的Markdown渲染
  function renderMarkdownWithLatexHighlight(content: string) {
    // 匹配$...$和$$...$$表达式
    const inline = /\$(.+?)\$/g;
    const block = /\$\$(.+?)\$\$/g;
    const parts: (string | { latex: string })[] = [];
    let lastIdx = 0;
    // 先处理块级
    content.replace(block, (m, p1, offset) => {
      if (offset > lastIdx) parts.push(content.slice(lastIdx, offset));
      parts.push({ latex: p1 });
      lastIdx = offset + m.length;
      return m;
    });
    content = content.slice(lastIdx);
    lastIdx = 0;
    // 再处理行内
    content.replace(inline, (m, p1, offset) => {
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
                if (/[%]|\\times\s*100|\*100/.test(part.latex)) {
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const selectedDocs = selectedDocuments.map(id => {
    const doc = knowledgeDocs.find(d => d.id === id);
    return doc ? { id: doc.id, name: doc.name } : null;
  }).filter(Boolean) as { id: string, name: string }[];

  // 发送消息并处理AI回复
  const sendMessage = async (msg: string) => {
    if (!msg.trim() || selectedDocuments.length === 0 || isSending) return;
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsSending(true);
    // 先插入一条空的 assistant 消息，streaming: true
    const aiMsgId = `msg-${Date.now() + 1}`;
    setChatMessages(prev => [
      ...prev,
      { id: aiMsgId, role: "assistant", content: "", timestamp: new Date().toISOString(), streaming: true }
    ]);
    try {
      // 构建 prompt
      const selectedDocsNames = selectedDocuments.map(id => knowledgeDocs.find(d => d.id === id)?.name || "").filter(Boolean);
      const prompt = `请基于以下知识型文档进行财务分析：${selectedDocsNames.join(", ")}`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${prompt}\n用户问题：${userMessage.content}`,
          documentIds: selectedDocuments,
          chatHistory: chatMessages.slice(-10),
        }),
      });
      if (!res.ok) throw new Error("AI回复失败");
      const chatResult = await res.json();
      let aiContent = chatResult.response;
      aiContent = aiContent.replace(/\[([^\[]+?)\]/g, (m: string, p1: string) => `$$${p1}$$`);
      // 逐字输出
      let idx = 0;
      const typeInterval = 18; // ms
      function typeNext() {
        idx++;
        setChatMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: aiContent.slice(0, idx) } : m
        ));
        if (idx < aiContent.length) {
          setTimeout(typeNext, typeInterval);
        } else {
          setChatMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, streaming: false } : m
          ));
        }
      }
      typeNext();
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 2}`,
        role: "assistant",
        content: "抱歉，AI服务暂时不可用。",
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PageContainer maxWidth="3xl">
      <div className="flex flex-col h-[calc(100vh-64px)] gap-0"> {/* 64px 预留顶部导航高度，可根据实际调整 */}
        <section className="w-full flex-1 flex flex-col gap-0">
          <PageTitle>财务分析与预测</PageTitle>
          <p className="text-gray-700 mb-6">本页面可基于知识型文档（如会计准则、财务报表等），通过AI智能分析与预测，帮助用户快速获取各类财务指标、趋势和专业建议。</p>
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
            onSelectDocs={setSelectedDocuments}
            docSelectMode="multiple"
            docCategories={["knowledge"]}
            showUpload={false}
            presetQuestions={financialAnalysisPresets}
            sendDisabled={selectedDocuments.length === 0 || isSending}
            sendDisabledTip="请选择至少一个知识型文档"
            sendBtnText={isSending ? "发送中..." : "发送"}
            inputPlaceholder="请输入你的财务分析问题..."
            onSend={sendMessage}
          />
        </div>
        {/* 预设提问弹窗 */}
        {presetOpen && (
          <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.18)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:'#fff',borderRadius:8,boxShadow:'0 4px 24px 0 rgba(0,0,0,0.10)',padding:32,minWidth:340,maxWidth:480,position:'relative'}}>
              <button onClick={()=>setPresetOpen(false)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:20,cursor:'pointer'}}>&times;</button>
              <h3 style={{fontWeight:700,fontSize:18,marginBottom:16}}>常用财务分析提问</h3>
              <ul style={{padding:0,margin:0,listStyle:'none'}}>
                {financialAnalysisPresets.map((q,i)=>(
                  <li key={i} style={{marginBottom:12}}>
                    <button style={{background:'#f3f4f6',border:'none',borderRadius:4,padding:'8px 12px',width:'100%',textAlign:'left',cursor:'pointer'}}
                      onClick={()=>{setPresetOpen(false);}}>{q}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
} 