import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface HighlightLatexProps {
  children: React.ReactNode;
  onClick?: () => void;
}

const HighlightLatex: React.FC<HighlightLatexProps> = ({ children, onClick }) => {
  // children 可能是 $...$ 或 $$...$$ 包裹的字符串
  const content = typeof children === 'string' ? children : '';
  // 判断是否为块级公式
  const isBlock = content.startsWith('$$') && content.endsWith('$$');
  // 去除$符号
  const latex = isBlock ? content.slice(2, -2) : content.replace(/^\$|\$$/g, '');
  let html = '';
  try {
    html = katex.renderToString(latex, { displayMode: isBlock });
  } catch {
    html = content;
  }
  return (
    <span
      style={{
        background: "#FFF9DB",
        borderRadius: 4,
        padding: isBlock ? "8px 12px" : "2px 6px",
        cursor: "pointer",
        transition: "box-shadow 0.2s",
        boxShadow: "0 1px 4px 0 rgba(0,0,0,0.03)",
        borderBottom: "1px dashed #E6C200",
        display: isBlock ? "block" : "inline-block",
        margin: isBlock ? "12px 0" : undefined
      }}
      title="校验AI计算结果"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default HighlightLatex; 