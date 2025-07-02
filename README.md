# Project Goodman 阶段性总结（截至第三模块开发前）

### **已完成内容**

#### **1. 项目定位与技术选型**
- **目标**：打造一个基于 Next.js + OpenAI 的 AI 财务助手，分为三个模块：智能文档分析、财务分析与预测、智能对话。
- **技术栈**：Next.js 15、React、OpenAI API、pdfjs-dist、xlsx、Tailwind CSS、Zustand。
- **部署约束**：仅支持 Vercel，兼容免费版的无状态/无持久化存储环境。
- **数据方案**：当前所有知识型和业务型文档均通过本地 Python 脚本预处理为 JSON 文件，保存在 `data/documents/` 文件夹，前端直接加载，无需数据库和云存储。

#### **2. 模块一：智能文档分析（已完成）**
- **功能**：用户上传 PDF，前端用 pdfjs-dist 提取文本，发送到 `/api/analyze`，由 GPT-4o 识别文档类型并提取关键信息，返回扁平 JSON（支持多语言 key）。
- **前端**：卡片网格展示结构化数据，支持一键复制 key、value 或全部。
- **代码**：`src/app/pdf-upload/page.tsx`、`src/app/api/analyze/route.ts`

#### **3. 模块二：财务分析与预测（已完成）**
- **功能**：
  - 支持上传/选择本地预处理 JSON 文档（由 Python 脚本生成，支持 PDF/Excel/TXT/CSV 源文件）。
  - 文档管理：多文档卡片展示，支持多选、预览（含摘要和完整内容）。
  - AI 对话：用户可选择多个文档，向 `/api/chat` 发送问题，AI 基于文档内容和历史对话返回答案。
- **前端**：标签页切换（上传、管理、AI对话），UI 体验流畅。
- **代码**：`src/app/financial-analysis/page.tsx`、`src/app/api/process-document/route.ts`、`src/app/api/chat/route.ts`、`src/store/documents.ts`、`src/components/DocumentManager.tsx`

#### **4. 本地知识库方案说明**
- **所有文档（知识型/业务型）均通过 Python 脚本预处理为 JSON，放在 `data/documents/` 文件夹。**
- **前端"上传文档"按钮实际为"选择本地 JSON 文档"，用户可从 `data/documents/` 文件夹中选择已处理好的文档。**
- **所有 embedding、分块、摘要等信息均在本地 JSON 文件中，前端直接加载和检索。**
- **无需数据库、云存储或 Supabase，便于演示和离线使用。**

#### **5. 其他说明**
- **首页与全局导航**：为避免构建冲突，已回滚至最初状态，后续 UI 统一优化。
- **所有客户端专用库均已妥善处理，当前代码可正常本地开发和部署。**
- **已删除为动态导入而创建的中间组件，所有页面恢复为单文件实现。**
- **Supabase 相关代码和文档已全部移除，未来如需云端知识库可平滑迁移。**

---

## **下一步开发计划**

### **第三模块：智能对话助手（即将开发）**
- **目标**：实现基于已上传/已加载本地 JSON 文档的多轮自然语言对话与智能检索。
- **功能要点**：
  - 支持多文档上下文对话，用户可灵活选择业务型/知识型文档参与对话。
  - 前端本地实现 embedding 检索与上下文拼接，结合 OpenAI API 实现智能问答。
  - 支持对话历史管理、上下文窗口控制。
  - 未来可平滑升级为云端知识库（如 Supabase），支持多人协作和持久化。
- **技术路线**：
  - 继续采用本地 JSON 文档知识库方案，embedding 检索和对话上下文拼接在前端实现。
  - 预留接口，便于未来切换为云端 API。

---

**如需 Python 预处理脚本、前端 embedding 检索/对话代码模板，或有其他架构/功能建议，请随时联系开发者。**

## 目录结构
```
project-goodman/
  data/
    documents/   # 预处理后的 JSON 文档知识库
  src/
    app/
    components/
    store/
  README.md
```

## 本地知识型/业务型文档 JSON 结构示例
```json
{
  "id": "doc-20240601-001",
  "name": "2023年会计准则.json",
  "type": "knowledge", // 或 business
  "summary": { ... },
  "chunks": [
    { "id": "chunk-1", "text": "...", "embedding": [0.1, 0.2, ...] },
    ...
  ]
}
```

## 如何添加新文档
1. 使用 Python 脚本将原始文档（PDF/Excel/TXT/CSV）分块、生成 embedding、摘要等，保存为 JSON 文件。
2. 将 JSON 文件放入 `data/documents/` 文件夹。
3. 前端页面选择/加载该文档，即可进行分析和对话。

## 未来升级建议
- 可平滑迁移到 Supabase/云端知识库，只需将本地 JSON 读写逻辑替换为 API 调用。
- 支持大文件、多人协作、权限管理等。

## 致谢
- OpenAI API
- pdfjs-dist, xlsx 等文档处理库
