"use client";
import React from "react";
import { FaGithub, FaGlobe, FaXTwitter, FaInstagram, FaEnvelope } from "react-icons/fa6";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import Image from "next/image";

const links = [
  // removed, now in Navbar
];

export default function AboutHelpPage() {
  return (
    <PageContainer maxWidth="3xl">
      <PageTitle>关于 / 帮助</PageTitle>
        {/* Social links removed, now in Navbar */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <Image src="/logo.png" alt="Goodman Logo" width={32} height={32} className="inline-block align-middle" />
            <span>是什么？</span>
          </h2>
          <p className="mb-2">Goodman 是一款面向财务会计领域的智能 AI 助手，当前已提供财务信息提取、财务分析预测、财务合规指导等3个核心功能，具备专业、现代、统一的前端UI与交互体验。</p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">为什么开发这个项目？</h2>
          <p className="mb-2"><span className="font-bold">财务会计需要被 AI 重塑。</span>
          对于财会领域的所有工作，AI 均可以提供巨大的帮助。本项目旨在通过开发 AI 财会助手，来展示作者对“ AI 如何改变和提速财务工作”的理解。</p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">怎么使用这个项目？</h2>
          <p className="mb-2">功能详细说明请见该项目<a href="https://github.com/antelacus/project-goodman" target="_blank" rel="noopener noreferrer" className="text-yellow-500 underline hover:text-yellow-400">GitHub主页</a>。</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>财务信息提取：自动提取财务文档信息，支持 PDF 上传与关键信息结构化输出。</li>
            <li>财务分析预测：基于数据库文档，AI 智能分析财务指标、趋势与预测。</li>
            <li>财务合规指导：结合数据库文档与待处理文档，AI 判断业务处理是否符合相关法规与准则。</li>
            <li>文档管理：统一管理数据库文档与待处理文档，支持分类、批量选择、属性编辑和重命名。</li>
          </ul>
        </section>
        <section  className="mb-10">
          <h2 className="text-xl font-bold mb-3">常见问题</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>我无法获得 AI 回答？——该项目目前使用 OpenAI API 以提供最佳体验，请调整网络环境。未来将支持更多 AI 服务。</li>
            <li>我上传的文档是否会泄露？——所有上传文档仅在前端处理，当前无持久化存储，保障隐私。可参见项目代码。</li>
            <li>AI 的回答可信吗？——通常来说可信，但受限于当前 AI 模型的技术原理，无法保证100%正确。请谨慎判别后使用。</li>
            <li>我想要XXX功能，能否实现？——请使用右上角联系方式联系作者。作者长期从事财务会计领域工作，理解财会人的痛苦。</li>
          </ul>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">技术栈</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>前端框架：Next.js 15, React 19, Zustand, Tailwind CSS 4</li>
            <li>AI服务：OpenAI GPT-4.1, OpenAI Embeddings</li>
            <li>文档处理：pdfjs-dist, xlsx</li>
            <li>部署：Vercel（无数据库依赖，兼容免费版）</li>
          </ul>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">联系方式</h2>
          <p>如需交流或反馈，欢迎通过导航栏中的社交账号或邮箱联系我！</p>
        </section>
      </PageContainer>
  );
} 