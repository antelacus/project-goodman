"use client";
import React from "react";
import PageContainer from "../../components/PageContainer";
import Image from "next/image";

export default function AboutHelpPage() {
  return (
    <PageContainer maxWidth="3xl">
      {/* HERO */}
      <section className="flex flex-col items-center text-center mb-16">
        <Image src="/logo.png" alt="Goodman Logo" width={80} height={80} />
        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-black">Accounting Meets AI</h1>
        <p className="mt-4 max-w-xl text-gray-700">
          让财务工作流<span className="font-semibold">全自动、零压力</span>。
          Goodman 不仅是一款<strong className="text-black">可直接部署的财务 AI 产品</strong>，更是作者在 AI + Accounting 领域思考的<strong className="text-black">综合展示</strong>。
        </p>
      </section>

      {/* VALUE PROPS */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">为什么选择 Goodman？</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><span className="font-semibold text-black">精准专业</span>：嵌入最新会计准则与法规，给出可信建议。大幅度避免 AI 幻觉和错误回答。</li>
          <li><span className="font-semibold text-black">易于扩展</span>：模块化架构，可轻松接入企业自有 Embedding / LLM 服务，快速适配已有工作流。</li>
          <li><span className="font-semibold text-black">极速高效</span>：前端即可完成 PDF 解析与 AI 推理，秒级出结果。</li>
          <li><span className="font-semibold text-black">无痛部署</span>：零后端依赖，Vercel 一键部署，支持企业私有化。</li>
        </ul>
      </section>

      {/* TECH STACK */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">技术亮点</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>前端框架：Next.js 15, React 19, Zustand, Tailwind CSS 4</li>
          <li>AI 服务：OpenAI GPT-4.1 &amp; Embeddings，可替换为企业自有模型</li>
          <li>文档处理：pdfjs-dist, xlsx，支持表格解析与公式计算</li>
          <li>部署：Vercel Serverless，无数据库依赖，免费额度即可运行</li>
        </ul>
      </section>

      {/* FAQ */}
      <section id="faq" className="mb-12 scroll-mt-24">
        <h2 className="text-xl font-bold mb-4">常见问题</h2>
        <div className="space-y-4">
          <details className="p-4 bg-white rounded-lg shadow">
            <summary className="font-semibold cursor-pointer select-none">我无法获得 AI 回答？</summary>
            <p className="mt-2 text-gray-700">该项目目前使用 OpenAI API 以提供最佳体验，请调整网络环境。未来将支持更多 AI 服务。</p>
          </details>
          <details className="p-4 bg-white rounded-lg shadow">
            <summary className="font-semibold cursor-pointer select-none">为什么不能上传我要用数据库文档？</summary>
            <p className="mt-2 text-gray-700">该项目目前受技术条件限制（免费版Vercel，无后端数据库），暂无法上传更多数据库文档。未来将支持。</p>
          </details>
          <details className="p-4 bg-white rounded-lg shadow">
            <summary className="font-semibold cursor-pointer select-none">我上传的文档是否会泄露？</summary>
            <p className="mt-2 text-gray-700">所有上传文档仅在前端处理，目前无持久化存储，保障隐私。可参见项目代码。</p>
          </details>
          <details className="p-4 bg-white rounded-lg shadow">
            <summary className="font-semibold cursor-pointer select-none">AI 的回答可信吗？</summary>
            <p className="mt-2 text-gray-700">通常来说可信，但受限于当前 AI 模型技术原理，无法保证 100% 正确。请谨慎甄别后使用。</p>
          </details>
          <details className="p-4 bg-white rounded-lg shadow">
            <summary className="font-semibold cursor-pointer select-none">我想要新功能，能否实现？</summary>
            <p className="mt-2 text-gray-700">请使用右上角联系方式联系作者。作者长期从事财务会计领域工作，理解财会人的痛点。</p>
          </details>
        </div>
      </section>

      {/* AUTHOR INTRO */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">作者 &amp; 职业价值</h2>
        <p className="mb-4 text-gray-700">
          你好！我是 <span className="font-semibold text-black">Jason</span>，一名拥有 <span className="font-semibold">财务审计 + 财务数字化</span> 背景的开发者。
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><span className="font-semibold text-black">财务</span>：四大会计师事务所背景，深懂财务流程与合规痛点。</li>
          <li><span className="font-semibold text-black">AI</span>：AI 爱好者，对 AI 在财务领域的应用有浓厚兴趣。</li>
          <li><span className="font-semibold text-black">营销</span>：主导 SaaS 产品从 0 → 1 上线，擅长产品定位与增长。</li>
        </ul>
      </section>

      {/* CONTACT CTA */}
      <section className="flex flex-col items-center text-center mb-20">
        <h2 className="text-2xl font-extrabold mb-4">想要把 AI 带入财务团队？</h2>
        <p className="max-w-md text-gray-700 mb-6">不论您是对该项目还是对作者感兴趣，均欢迎通过导航栏的社交账号或邮箱联系作者，一起探讨未来可能性！</p>
      </section>
    </PageContainer>
  );
} 