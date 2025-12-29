import React from 'react';
import {
  MessageSquare,
  FolderOpen,
  Zap,
  BookOpen,
  FileSpreadsheet,
  Database,
  Search,
  Upload
} from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl py-10 px-4">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-neutral-900">使用指南</h1>
        <p className="text-neutral-600">快速了解如何使用 Goodman 提升财务工作效率</p>
      </div>

      {/* Module Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-16">
        {/* Smart Chat */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4 text-blue-600 bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center">
            <MessageSquare size={24} />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-900">智能对话</h3>
          <p className="text-sm text-neutral-600">
            统一的 AI 对话入口。支持上下文记忆、流式响应，可自动调用财务计算与法规检索工具。
          </p>
        </div>

        {/* Document Management */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4 text-yellow-600 bg-yellow-50 w-12 h-12 rounded-full flex items-center justify-center">
            <FolderOpen size={24} />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-900">文档管理</h3>
          <p className="text-sm text-neutral-600">
            上传并管理您的财务文档。系统会自动进行向量化处理，支持语义搜索与结构化提取。
          </p>
        </div>

        {/* Quick Tools */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4 text-green-600 bg-green-50 w-12 h-12 rounded-full flex items-center justify-center">
            <Zap size={24} />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-900">快捷工具</h3>
          <p className="text-sm text-neutral-600">
            支持 PDF、Excel、图片等多种格式的信息提取，快速将非结构化文档转化为结构化数据。
          </p>
        </div>
      </div>

      {/* Document Types Section */}
      <div className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Database className="text-yellow-500" size={28} />
          支持的文档类型
        </h2>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-neutral-50 text-neutral-900">
              <tr>
                <th className="px-6 py-4 font-semibold">主类别</th>
                <th className="px-6 py-4 font-semibold">文档类型</th>
                <th className="px-6 py-4 font-semibold">处理方式</th>
                <th className="px-6 py-4 font-semibold">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 font-medium text-neutral-900">财务报表</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1"><FileSpreadsheet size={14} /> 资产负债表</span>
                    <span className="inline-flex items-center gap-1"><FileSpreadsheet size={14} /> 利润表</span>
                    <span className="inline-flex items-center gap-1"><FileSpreadsheet size={14} /> 现金流量表</span>
                  </div>
                </td>
                <td className="px-6 py-4">指标提取 + 向量化</td>
                <td className="px-6 py-4">需指定年份和期间，数据将存入结构化数据库</td>
              </tr>
              <tr className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 font-medium text-neutral-900">法规准则</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1"><BookOpen size={14} /> 法律法规</span>
                    <span className="inline-flex items-center gap-1"><BookOpen size={14} /> 会计准则</span>
                  </div>
                </td>
                <td className="px-6 py-4">条款结构化 + 向量化</td>
                <td className="px-6 py-4">要求文档遵循标准的“第X条”格式以便提取</td>
              </tr>
              <tr className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 font-medium text-neutral-900">其他信息</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span>业务情况</span>
                    <span>财务报告 (PDF)</span>
                    <span>规章制度</span>
                  </div>
                </td>
                <td className="px-6 py-4">仅向量化</td>
                <td className="px-6 py-4">用于语义搜索，增强 AI 上下文理解</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Operation Guide */}
      <div className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Upload className="text-blue-500" size={28} />
          如何添加知识库
        </h2>
        <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
          <ol className="relative border-l border-neutral-200 ml-3 space-y-8">
            <li className="mb-10 ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-4 ring-white text-blue-600 font-bold text-sm">
                1
              </span>
              <h3 className="flex items-center mb-1 text-lg font-semibold text-neutral-900">进入管理模式</h3>
              <p className="mb-4 text-base font-normal text-neutral-600">
                为了保证数据安全，文档上传功能仅限管理员使用。请确保已获取管理员权限。
              </p>
            </li>
            <li className="mb-10 ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-4 ring-white text-blue-600 font-bold text-sm">
                2
              </span>
              <h3 className="mb-1 text-lg font-semibold text-neutral-900">选择文档类型</h3>
              <p className="text-base font-normal text-neutral-600">
                在上传界面，准确选择文档所属的类别（如资产负债表、法律法规等）。正确的分类对于后续的智能分析至关重要。
              </p>
            </li>
            <li className="ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-4 ring-white text-blue-600 font-bold text-sm">
                3
              </span>
              <h3 className="mb-1 text-lg font-semibold text-neutral-900">等待自动处理</h3>
              <p className="text-base font-normal text-neutral-600">
                点击上传后的几秒钟内，系统会自动完成文件解析、结构化数据提取和向量化索引。完成后即可在对话中即时引用。
              </p>
            </li>
          </ol>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500">
        <p>如需更多帮助，请联系技术支持。</p>
      </div>
    </div>
  );
}
