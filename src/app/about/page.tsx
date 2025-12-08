"use client";
import React from "react";
import PageContainer from "../../components/PageContainer";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <PageContainer maxWidth="3xl">
      {/* HERO */}
      <section className="flex flex-col items-center text-center mb-16">
        <Image src="/logo.png" alt="Goodman Logo" width={80} height={80} />
        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-black">Accounting Meets AI</h1>
        <p className="mt-4 max-w-xl text-gray-700">
          Goodman 是一款<strong className="text-black">面向财务场景的 AI 应用</strong>，
          也是作者在 AI + Accounting 领域的<strong className="text-black">综合能力展示</strong>。
        </p>
      </section>

      {/* PROJECT VISION */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">项目愿景</h2>
        <p className="text-gray-700 mb-4">
          财务工作中存在大量重复性、规则性的任务：从报表中提取数据、计算财务指标、查阅法规条款……
          这些工作耗时且容易出错，却又是专业判断的基础。
        </p>
        <p className="text-gray-700 mb-4">
          Goodman 的目标是：<span className="font-semibold text-black">让 AI 处理繁琐的数据工作，让财务人专注于专业判断</span>。
        </p>
        <p className="text-gray-700">
          这不仅是一个产品原型，更是对"AI 如何真正赋能财务工作"这一命题的实践探索。
        </p>
      </section>

      {/* CORE CAPABILITIES */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">核心能力</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-black mb-2">财务信息提取</h3>
            <p className="text-sm text-gray-700">上传发票、合同等文档，AI 自动识别并结构化关键信息。</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-black mb-2">财务指标分析</h3>
            <p className="text-sm text-gray-700">基于财务报表数据，自动计算财务指标并生成分析报告。</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-black mb-2">财务合规指导</h3>
            <p className="text-sm text-gray-700">结合会计准则与法规，提供业务合规性判断与建议。</p>
          </div>
        </div>
      </section>

      {/* TECH HIGHLIGHTS */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">技术亮点</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><span className="font-semibold text-black">双重存储架构</span>：结构化数据库 + 向量检索，兼顾精确查询与语义搜索</li>
          <li><span className="font-semibold text-black">确定性计算</span>：数学运算由代码执行而非 AI 生成，确保计算结果准确可验证</li>
          <li><span className="font-semibold text-black">混合检索</span>：关键词匹配 + 语义相似度，提升法规条款检索的准确率</li>
          <li><span className="font-semibold text-black">现代技术栈</span>：Next.js 15、React 19、Supabase (PostgreSQL + pgvector)、OpenAI gpt-5-mini</li>
        </ul>
      </section>

      {/* AUTHOR INTRO */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">关于作者</h2>
        <p className="mb-4 text-gray-700">
          你好！我是 <span className="font-semibold text-black">Jason</span>，一名拥有<span className="font-semibold">财务审计 + 财务数字化</span>背景的从业者。
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-black mb-2">专业背景</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 四大会计师事务所审计经验</li>
              <li>• 企业财务数字化项目经历</li>
              <li>• 深谙财务流程与合规痛点</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-black mb-2">技术能力</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 全栈开发：TypeScript、React、Node.js</li>
              <li>• AI 应用：Prompt Engineering、RAG、Agent</li>
              <li>• 数据分析：Python、SQL、机器学习</li>
            </ul>
          </div>
        </div>
      </section>

      {/* WHY THIS PROJECT */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">为什么做这个项目？</h2>
        <p className="text-gray-700 mb-4">
          在财务领域工作多年，我深知两个事实：
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
          <li>财务人花费大量时间在<span className="font-semibold">数据搬运</span>而非<span className="font-semibold">专业判断</span>上</li>
          <li>通用 AI 工具难以直接应用于财务场景——<span className="font-semibold">准确性</span>和<span className="font-semibold">可追溯性</span>是刚性要求</li>
        </ul>
        <p className="text-gray-700">
          Goodman 是我对这一问题的回答：构建一个真正理解财务场景、输出可信可验证的 AI 助手。
        </p>
      </section>

      {/* CONTACT CTA */}
      <section className="flex flex-col items-center text-center mb-20 p-8 bg-yellow-50 rounded-lg">
        <h2 className="text-2xl font-extrabold mb-4">期待与您交流</h2>
        <p className="max-w-md text-gray-700 mb-6">
          无论您是对项目感兴趣、寻求合作机会，还是想探讨 AI 在财务领域的应用，都欢迎通过邮箱与我联系。
        </p>
        <a
          href="mailto:me@antelacus.com"
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-8 rounded shadow transition-colors"
        >
          联系作者
        </a>
      </section>

      {/* LINK TO HELP */}
      <section className="text-center mb-8">
        <p className="text-gray-600">
          需要了解如何使用 Goodman？请访问
          <Link href="/help" className="text-yellow-600 hover:text-yellow-700 font-semibold ml-1">
            使用指南
          </Link>
        </p>
      </section>
    </PageContainer>
  );
}
