import {
  Zap,
  Shield,
  FileText,
  Database,
  Cpu,
  GitBranch,
  Server,
  FileSpreadsheet,
  BookOpen,
} from "lucide-react";
import React from 'react';
import { appVersionLabel } from '@/lib/build-info';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl py-10 px-4">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-neutral-900">关于 Project Goodman</h1>
        <p className="text-neutral-600">面向财务人员的 AI 辅助工具</p>
        <p className="mt-2 text-sm text-neutral-500">当前版本：{appVersionLabel}</p>
      </div>

      {/* Vision & Architecture */}
      <div className="grid gap-8 md:grid-cols-2 mb-16">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">项目愿景</h2>
          <p className="leading-relaxed text-neutral-600">
            Project Goodman 旨在为财务人员提供 AI 辅助能力，帮助处理文档信息提取、财务指标计算、财务文档查询和财务合规咨询等日常工作，
            减少重复性劳动，让您有更多时间专注于分析和决策。
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">技术架构</h2>
          <p className="leading-relaxed text-neutral-600 mb-4">
            基于现代 Web 技术栈与 LangGraph 框架构建，财务数据结构化存储，法规与文档以中文关键词检索。
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">Next.js</span>
            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">React</span>
            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">LangGraph</span>
            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">Supabase</span>
            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">PostgreSQL + PGroonga</span>
            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">OpenAI 兼容 API</span>
            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">Redis</span>
            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md">Docker</span>
          </div>
        </div>
      </div>

      {/* Core Technical Features */}
      <div className="mb-16">
        <h2 className="mb-8 text-2xl font-bold text-neutral-900">核心技术特性</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center text-center rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <Database size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">可核验的检索</h3>
            <p className="text-sm text-neutral-500">中文关键词检索，法规出处由程序生成并链接原文</p>
          </div>
          <div className="flex flex-col items-center text-center rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <GitBranch size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">Agent 工作流</h3>
            <p className="text-sm text-neutral-500">基于 LangGraph 的多步骤推理与工具调用</p>
          </div>
          <div className="flex flex-col items-center text-center rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <Zap size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">流式响应</h3>
            <p className="text-sm text-neutral-500">实时流式输出，支持过程可视化</p>
          </div>
          <div className="flex flex-col items-center text-center rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <FileText size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">结构化报告</h3>
            <p className="text-sm text-neutral-500">自动生成可导出的财务分析报告</p>
          </div>
          <div className="flex flex-col items-center text-center rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <Cpu size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">指标计算引擎</h3>
            <p className="text-sm text-neutral-500">预置财务公式，支持自定义扩展</p>
          </div>
          <div className="flex flex-col items-center text-center rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <Shield size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">安全设计</h3>
            <p className="text-sm text-neutral-500">HttpOnly Cookie、速率限制、私有化部署</p>
          </div>
        </div>
      </div>

      {/* Supported Document Types */}
      <div className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Server className="text-yellow-500" size={28} />
          支持的文档类型
        </h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-[720px] w-full text-left text-sm text-neutral-600">
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
                <td className="px-6 py-4">指标提取 + 关键词索引</td>
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
                <td className="px-6 py-4">条款结构化 + 关键词索引</td>
                <td className="px-6 py-4">要求文档遵循标准的&ldquo;第X条&rdquo;格式以便提取</td>
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
                <td className="px-6 py-4">仅关键词索引</td>
                <td className="px-6 py-4">供 AI 检索公司自己的做法与资料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500">
        <p>Created by Antelacus</p>
      </div>
    </div>
  );
}
