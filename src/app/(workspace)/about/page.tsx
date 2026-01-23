import { Zap, Shield, FileText } from "lucide-react";
import React from 'react';
import { appVersionLabel } from '@/lib/build-info';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl py-10">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-neutral-900">关于 Project Goodman</h1>
        <p className="text-neutral-600">面向财务人员的 AI 辅助工具</p>
        <p className="mt-2 text-sm text-neutral-500">当前版本：{appVersionLabel}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">项目愿景</h2>
          <p className="leading-relaxed text-neutral-600">
            Project Goodman 旨在为财务人员提供 AI 辅助能力，帮助处理文档信息提取、财务指标计算和合规查询等日常工作，
            减少重复性劳动，让您有更多时间专注于分析和决策。
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">技术架构</h2>
          <p className="leading-relaxed text-neutral-600">
            基于 Next.js 与 Supabase 构建的现代 Web 应用，采用结构化数据与向量检索相结合的存储方案，
            集成大语言模型提供智能交互能力。
          </p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-8 text-2xl font-bold text-neutral-900">核心特性</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <FileText size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">信息提取</h3>
            <p className="text-sm text-neutral-500">解析常见格式文档，辅助提取关键信息</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <Zap size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">智能分析</h3>
            <p className="text-sm text-neutral-500">支持常用财务指标计算与对比分析</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <Shield size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">合规参考</h3>
            <p className="text-sm text-neutral-500">提供会计准则与法规查询参考</p>
          </div>
        </div>
      </div>

      <div className="mt-16 border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500">
        <p>Created by Antelacus</p>
      </div>
    </div>
  );
}
