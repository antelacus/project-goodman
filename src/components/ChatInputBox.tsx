import React, { useState } from "react";
import DocumentSelectModal from "./DocumentSelectModal";

interface ChatInputBoxProps {
  selectedDocs: { id: string; name: string }[];
  onSelectDocs: (ids: string[]) => void;
  docSelectMode: "single" | "multiple";
  docCategories: ("knowledge" | "business")[];
  showUpload?: boolean;
  presetQuestions?: string[];
  onSend: (msg: string) => void;
  sendDisabled: boolean;
  sendDisabledTip?: string;
  sendBtnText?: string;
  inputPlaceholder?: string;
}

const ChatInputBox: React.FC<ChatInputBoxProps> = ({
  selectedDocs,
  onSelectDocs,
  docSelectMode,
  docCategories,
  showUpload = false,
  presetQuestions = [],
  onSend,
  sendDisabled,
  sendDisabledTip = "请选择至少一个文档以开启对话",
  sendBtnText = "发送",
  inputPlaceholder = "请输入..."
}) => {
  const [input, setInput] = useState("");
  const [showDocModal, setShowDocModal] = useState(false);
  const [showPreset, setShowPreset] = useState(false);

  const handleSend = () => {
    if (!sendDisabled && input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <div className="w-full border rounded-xl bg-white p-4 shadow-sm">
      {/* 选中文档展示区 */}
      {selectedDocs.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedDocs.map(doc => (
            <span key={doc.id} className="px-3 py-1 bg-gray-100 rounded text-sm text-black font-medium truncate max-w-xs">{doc.name}</span>
          ))}
        </div>
      )}
      {/* 输入区 */}
      <textarea
        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-black bg-white text-black resize-none mb-2"
        placeholder={inputPlaceholder}
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={2}
        style={{ minHeight: 40, maxHeight: 120, overflow: 'auto' }}
        onKeyDown={e => (e.key === 'Enter' && !e.shiftKey && !sendDisabled && input.trim()) ? (e.preventDefault(), handleSend()) : undefined}
        disabled={sendDisabled}
      />
      {/* 按钮区 */}
      <div className="flex gap-2 mt-2 items-center">
        {/* 文档选择按钮放最左侧 */}
        <button
          type="button"
          className="border border-black rounded px-3 py-2 font-medium bg-white hover:bg-gray-100 transition-colors"
          onClick={() => setShowDocModal(true)}
          style={{ minWidth: 90 }}
        >文档选择</button>
        {/* 预设提问按钮放中间 */}
        <button
          type="button"
          className="border border-black rounded px-3 py-2 font-medium bg-white hover:bg-gray-100 transition-colors"
          onClick={() => setShowPreset(true)}
          style={{ minWidth: 90 }}
        >预设提问</button>
        {/* 发送按钮放最右侧，flex自动推到右边 */}
        <div className="flex-1" />
        <button
          onClick={handleSend}
          disabled={sendDisabled || !input.trim()}
          className="border border-black rounded px-5 py-2 font-medium transition-colors duration-200 hover:bg-black hover:text-white focus:outline-none disabled:opacity-50 relative"
          style={{ minWidth: 90 }}
          title={sendDisabled && sendDisabledTip ? sendDisabledTip : undefined}
        >{sendBtnText}</button>
      </div>
      {/* 预设提问弹窗 */}
      {showPreset && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.18)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:8,boxShadow:'0 4px 24px 0 rgba(0,0,0,0.10)',padding:32,minWidth:340,maxWidth:480,position:'relative'}}>
            <button onClick={()=>setShowPreset(false)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:20,cursor:'pointer'}}>&times;</button>
            <h3 style={{fontWeight:700,fontSize:18,marginBottom:16}}>常用提问</h3>
            <ul style={{padding:0,margin:0,listStyle:'none'}}>
              {presetQuestions.map((q,i)=>(
                <li key={i} style={{marginBottom:12}}>
                  <button style={{background:'#f3f4f6',border:'none',borderRadius:4,padding:'8px 12px',width:'100%',textAlign:'left',cursor:'pointer'}}
                    onClick={()=>{setInput(q);setShowPreset(false);}}>{q}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* 文档选择弹窗 */}
      {showDocModal && (
        <DocumentSelectModal
          open={showDocModal}
          onClose={()=>setShowDocModal(false)}
          mode={docSelectMode}
          categories={docCategories}
          selectedIds={selectedDocs.map(d=>d.id)}
          onSelect={ids=>{onSelectDocs(ids); if(docSelectMode==="single") setShowDocModal(false);}}
          showUpload={showUpload}
        />
      )}
    </div>
  );
};

export default ChatInputBox; 