"use client";
import React from "react";
import { FaGithub, FaGlobe, FaXTwitter, FaInstagram, FaEnvelope } from "react-icons/fa6";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";

const links = [
  { icon: <FaGithub className="inline mr-2" />, label: "GitHub", url: "https://github.com/antelacus" },
  { icon: <FaEnvelope className="inline mr-2" />, label: " send email", url: "mailto:me@antelacus.com" },
];

export default function AboutHelpPage() {
  return (
    <PageContainer maxWidth="3xl">
      <PageTitle>关于 / 帮助</PageTitle>
        <div className="flex flex-wrap gap-6 mb-10">
          {links.map((item) => (
            <a
              key={item.label}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 border rounded hover:bg-gray-50 transition text-lg font-medium"
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
        </div>
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">项目简介</h2>
          <p className="mb-2">Project Goodman 是一款面向财务与合规领域的智能AI助手，支持智能文档分析、财务分析与预测、合规性指导等核心功能，具备专业、现代、统一的前端UI与交互体验。</p>
          <p className="mb-2">本项目旨在通过三个核心模块全面提升财务工作效率，展示&quot;AI如何改变和提速财务工作&quot;的专业理解。</p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">核心功能</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>智能文档分析：自动提取财务文档信息，支持PDF上传与关键信息结构化输出。</li>
            <li>财务分析与预测：基于知识型文档，AI智能分析财务指标、趋势与预测。</li>
            <li>合规性指导：结合知识型与业务型文档，AI判断业务处理是否符合相关法规与准则。</li>
            <li>文档管理：统一管理知识型与业务型文档，支持分类、批量选择、属性编辑和重命名。</li>
          </ul>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">技术栈</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>前端框架：Next.js 15, React 19, Zustand, Tailwind CSS 4</li>
            <li>AI服务：OpenAI GPT-4o, OpenAI Embeddings</li>
            <li>文档处理：pdfjs-dist, xlsx</li>
            <li>部署：Vercel（无数据库依赖，兼容免费版）</li>
          </ul>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">联系方式</h2>
          <p>如需交流或反馈，欢迎通过上方社交账号或邮箱联系我！</p>
        </section>
        <section>
          <h2 className="text-xl font-bold mb-3">常见问题</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>如何上传和管理文档？——请前往&quot;文档管理&quot;页面，支持多格式上传、批量选择和属性编辑。</li>
            <li>AI分析结果是否安全？——所有业务型文档仅在前端处理，不做持久化存储，保障隐私。</li>
            <li>如何体验AI分析与合规性判断？——请分别前往&quot;智能文档分析&quot;、&quot;财务分析与预测&quot;、&quot;合规性指导&quot;页面体验核心功能。</li>
          </ul>
        </section>
      </PageContainer>
  );
} 