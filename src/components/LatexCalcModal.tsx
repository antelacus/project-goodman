import React from "react";

interface LatexCalcModalProps {
  open: boolean;
  onClose: () => void;
  latex: string;
  parsedExpr?: string;
  calcResult?: string;
  error?: string;
}

const LatexCalcModal: React.FC<LatexCalcModalProps> = ({ open, onClose, latex, parsedExpr, calcResult, error }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.18)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
        padding: 32,
        minWidth: 340,
        maxWidth: 480,
        position: "relative"
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>&times;</button>
        <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>AI计算校验</h3>
        <div style={{ marginBottom: 12 }}><b>原始表达式：</b><span style={{ fontFamily: 'monospace' }}>{latex}</span></div>
        {error ? (
          <div style={{ color: '#d97706', fontWeight: 500 }}>{error}</div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}><b>可计算表达式：</b><span style={{ fontFamily: 'monospace' }}>{parsedExpr}</span></div>
            <div style={{ marginBottom: 12 }}><b>计算结果：</b><span style={{ fontFamily: 'monospace', color: '#059669' }}>{calcResult}</span></div>
          </>
        )}
      </div>
    </div>
  );
};

export default LatexCalcModal; 