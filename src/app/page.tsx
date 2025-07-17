"use client";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import PageContainer from "../components/PageContainer";

export default function HomePage() {
  const featureRef = useRef<HTMLDivElement | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [showChoice, setShowChoice] = useState(false);

  const closeChoice = () => setShowChoice(false);

  const ChoiceOverlay = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeChoice}>
      <div className="bg-white rounded-lg p-8 w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
        <h4 className="text-xl font-bold mb-4 text-center">选择你想开始的功能</h4>
        <div className="flex flex-col gap-4">
          <Link
            href="/data-extract"
            className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-black font-semibold py-3 rounded-lg text-center transition-colors shadow-sm hover:shadow-md"
          >
            财务信息提取
          </Link>
          <Link
            href="/financial-analysis"
            className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-black font-semibold py-3 rounded-lg text-center transition-colors shadow-sm hover:shadow-md"
          >
            财务指标分析
          </Link>
          <Link
            href="/guidance-chat"
            className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-black font-semibold py-3 rounded-lg text-center transition-colors shadow-sm hover:shadow-md"
          >
            财务合规指导
          </Link>
        </div>
        <button className="mt-6 w-full text-sm text-gray-500 hover:text-gray-700" onClick={closeChoice}>取消</button>
      </div>
    </div>
  );

  const handleExperienceClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (featureRef.current) {
      const y = featureRef.current.getBoundingClientRect().top + window.pageYOffset - 80; // offset for navbar
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setHighlight(true);
  };

  // Remove highlight after short duration
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(false), 3000);
    return () => clearTimeout(t);
  }, [highlight]);

  return (
    <PageContainer maxWidth="7xl">
      {/* HERO SECTION */}
      <section className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Image src="/logo.png" alt="Project Goodman Logo" width={260} height={260} priority />
        <h1 className="mt-6 text-4xl md:text-4xl font-extrabold text-black">
           新一代财务 AI 合作伙伴
        </h1>
        <p className="mt-3 text-xl font-semibold text-gray-900 italic">
          Goodman is the new kind of accounting.
        </p>
        <p className="max-w-2xl mt-4 text-lg md:text-xl text-gray-700">
          专为财务领域打造，集信息提取、指标分析与合规指导于一体的智能助手。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            href="#core-modules"
            onClick={handleExperienceClick}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-8 rounded shadow transition-colors"
          >
            立即体验
          </Link>
          <Link
            href="https://github.com/antelacus/project-goodman"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-semibold py-3 px-8 rounded transition-colors"
          >
            Star on GitHub
          </Link>
        </div>
      </section>

      {/* CORE MODULES */}
      <section id="core-modules" ref={featureRef} className="mt-12">
        <h2 className="text-2xl font-bold mb-8 text-center">三大核心能力</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {/* 模块一 */}
          <Link
            href="/data-extract"
            className={`bg-white rounded-lg p-6 flex flex-col items-center transition-all duration-300 group cursor-pointer ${
              highlight ? "ring-4 ring-yellow-400 scale-[1.03]" : "shadow"
            } hover:ring-4 hover:ring-yellow-400 hover:shadow-lg`}
          >
            <h3 className="text-xl font-bold text-black group-hover:text-yellow-500 mb-2">
              财务信息提取
            </h3>
            <p className="text-gray-600 text-sm mb-2">上传财务文档，AI 自动提取关键信息。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>支持发票、合同等文件</li>
              <li>自动结构化关键信息</li>
              <li>便捷灵活复制信息</li>
            </ul>
          </Link>
          {/* 模块二 */}
          <Link
            href="/financial-analysis"
            className={`bg-white rounded-lg p-6 flex flex-col items-center transition-all duration-300 group cursor-pointer ${
              highlight ? "ring-4 ring-yellow-400 scale-[1.03]" : "shadow"
            } hover:ring-4 hover:ring-yellow-400 hover:shadow-lg`}
          >
            <h3 className="text-xl font-bold text-black group-hover:text-yellow-500 mb-2">
              财务指标分析
            </h3>
            <p className="text-gray-600 text-sm mb-2">基于财务报表，AI 智能分析财务指标。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>多文档智能分析</li>
              <li>财务指标自动计算</li>
              <li>支持校验 AI 计算结果</li>
            </ul>
          </Link>
          {/* 模块三 */}
          <Link
            href="/guidance-chat"
            className={`bg-white rounded-lg p-6 flex flex-col items-center transition-all duration-300 group cursor-pointer ${
              highlight ? "ring-4 ring-yellow-400 scale-[1.03]" : "shadow"
            } hover:ring-4 hover:ring-yellow-400 hover:shadow-lg`}
          >
            <h3 className="text-xl font-bold text-black group-hover:text-yellow-500 mb-2">
              财务合规指导
            </h3>
            <p className="text-gray-600 text-sm mb-2">结合准则法规，AI 判断业务合规性。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>法规/准则自由匹配</li>
              <li>多文档联合分析</li>
              <li>合规性建议输出</li>
            </ul>
          </Link>
        </div>
      </section>

      {/* WHY GOODMAN */}
      <section className="bg-white rounded-lg p-8 mt-20">
        <h2 className="text-2xl font-bold mb-6 text-center">为什么选择 Goodman？</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold mb-2">专业可信</h3>
            <p className="text-sm text-gray-700">引用最新会计准则与法规，严谨可靠。</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">极致效率</h3>
            <p className="text-sm text-gray-700">从上传到结果，仅需数秒，支持批量处理。</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">轻松集成</h3>
            <p className="text-sm text-gray-700">无后端依赖，可托管至 Vercel 或企业私有云。</p>
          </div>
        </div>
      </section>

      {/* TECH FEATURES */}
      <section className="bg-white rounded-lg p-8 mt-20 w-full">
        <h3 className="text-2xl font-bold mb-6 text-center">技术特性</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl mb-2">🤖</div>
            <h4 className="font-semibold mb-2">AI 驱动</h4>
            <p className="text-sm text-gray-700">响应准确，基于 OpenAI GPT-4.1 技术</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">📁</div>
            <h4 className="font-semibold mb-2">本地知识库</h4>
            <p className="text-sm text-gray-700">避免幻觉，引用会计准则、法律法规</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⚡</div>
            <h4 className="font-semibold mb-2">扩展性强</h4>
            <p className="text-sm text-gray-700">功能灵活，根据业务需求随时调整</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🦢</div>
            <h4 className="font-semibold mb-2">简单易用</h4>
            <p className="text-sm text-gray-700">指引清晰，上手快速便捷</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="flex flex-col items-center text-center mt-24 mb-16">
        <h3 className="text-3xl font-extrabold mb-6">准备好让财务工作更 smart 吗？</h3>
        <button
          onClick={() => setShowChoice(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-4 px-10 rounded shadow transition-colors"
        >
          立即开始
        </button>
      </section>

      {showChoice && <ChoiceOverlay />}
    </PageContainer>
  );
}
