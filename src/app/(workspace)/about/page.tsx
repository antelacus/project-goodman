import { Zap, Shield, FileText } from "lucide-react";
import React from 'react';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl py-10">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-neutral-900">关于 Project Goodman</h1>
        <p className="text-neutral-600">新一代智能财务助手，重新定义财务工作流。</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">项目愿景</h2>
          <p className="leading-relaxed text-neutral-600">
            Project Goodman 致力于将人工智能技术引入财务领域，通过智能信息提取、自动化指标分析和合规性指导，
            将繁琐的财务基础工作自动化，让财务专业人员专注于更有价值的决策分析。
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">技术架构</h2>
          <p className="leading-relaxed text-neutral-600">
            基于 Next.js 与 Supabase 构建，采用双重存储架构（结构化数据 + 向量检索）。
            后端集成 GPT-5-mini 模型，通过 LangGraph 编排复杂的思维链（Chain of Thought），
            确保财务计算的准确性与合规建议的专业性。
          </p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-8 text-2xl font-bold text-neutral-900">核心特性</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-blue-50 p-4 text-blue-600">
              <FileText size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">信息提取</h3>
            <p className="text-sm text-neutral-500">自动解析多种格式文档，结构化关键信息</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-yellow-50 p-4 text-yellow-600">
              <Zap size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">智能分析</h3>
            <p className="text-sm text-neutral-500">多维度财务指标计算与趋势分析</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-green-50 p-4 text-green-600">
              <Shield size={32} />
            </div>
            <h3 className="mb-2 font-semibold text-neutral-900">合规保障</h3>
            <p className="text-sm text-neutral-500">实时引用最新法规，降低合规风险</p>
          </div>
        </div>
      </div>

      <div className="mt-16 border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500">
        <p>Current Version: V3.7 (Phase 1)</p>
        <p className="mt-2">Created by Antelacus</p>
      </div>
    </div>
  );
}
