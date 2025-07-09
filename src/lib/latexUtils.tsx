import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { evaluate } from "mathjs";
import HighlightLatex from "../components/HighlightLatex";

// 解析 LaTeX 表达式为可计算表达式
export function parseLatexToMath(latex: string): { expr: string, error?: string } {
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

// 通用高亮渲染函数
// 参数：content 文本，setModalXXX 一组 setState，modalOpen/setModalOpen 控制弹窗
export function renderMarkdownWithLatexHighlight(
  content: string,
  setModalLatex: (v: string) => void,
  setModalParsed: (v: string) => void,
  setModalResult: (v: string) => void,
  setModalError: (v?: string) => void,
  setModalOpen: (v: boolean) => void
) {
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
              const resultNum = Number(result);
              let formatted = isNaN(resultNum)
                ? result.toString()
                : resultNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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