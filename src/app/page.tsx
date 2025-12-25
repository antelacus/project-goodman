"use client";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import PageContainer from "../components/PageContainer";
import { FiCpu, FiFolder, FiZap, FiFeather, FiTrendingUp, FiCheckCircle } from "react-icons/fi";
import { FaFileInvoiceDollar } from "react-icons/fa";

export default function HomePage() {
    const featureRef = useRef<HTMLDivElement | null>(null);
    const [highlight, setHighlight] = useState(false);

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
        <div className="flex flex-col min-h-screen">
            <div className="bg-dot-pattern absolute inset-0 -z-10 h-[60vh] mask-image-gradient" />

            <PageContainer maxWidth="7xl">
                {/* HERO SECTION */}
                <section className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-yellow-400/20 blur-xl"></div>
                        <Image src="/logo.png" alt="Project Goodman Logo" width={260} height={260} priority className="relative" />
                    </div>
                    <h1 className="mt-8 text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
                        新一代财务 <span className="text-yellow-500">AI</span> 合作伙伴
                    </h1>
                    <p className="mt-4 text-2xl font-serif text-gray-800 italic opacity-90">
                        Goodman is the new kind of accounting.
                    </p>
                    <p className="max-w-2xl mt-6 text-lg text-gray-600 leading-relaxed">
                        专为财务领域打造，集信息提取、指标分析与合规指导于一体的智能助手。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 mt-10">
                        <Link
                            href="#core-modules"
                            onClick={handleExperienceClick}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-10 rounded-full shadow-lg hover:shadow-yellow-500/30 transition-all transform hover:-translate-y-1"
                        >
                            立即体验
                        </Link>
                    </div>
                </section>

                {/* CORE MODULES */}
                <section id="core-modules" ref={featureRef} className="py-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900">三大核心能力</h2>
                        <div className="w-16 h-1 bg-yellow-500 mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                        {/* 能力一 */}
                        <div
                            className={`bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center transition-all duration-300 group ${highlight ? "ring-4 ring-yellow-400 scale-[1.02]" : "shadow-sm hover:shadow-xl hover:-translate-y-2"
                                }`}
                        >
                            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-6 text-yellow-600 text-2xl group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                <FaFileInvoiceDollar />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                财务信息提取
                            </h3>
                            <p className="text-gray-600 text-base mb-6 text-center leading-relaxed">上传财务文档，AI 自动提取关键信息。</p>
                            <ul className="text-gray-500 text-sm list-disc pl-5 space-y-2">
                                <li>支持发票、合同等文件</li>
                                <li>自动结构化关键信息</li>
                                <li>便捷灵活复制信息</li>
                            </ul>
                        </div>
                        {/* 能力二 */}
                        <div
                            className={`bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center transition-all duration-300 group ${highlight ? "ring-4 ring-yellow-400 scale-[1.02]" : "shadow-sm hover:shadow-xl hover:-translate-y-2"
                                }`}
                        >
                            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-6 text-yellow-600 text-2xl group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                <FiTrendingUp />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                财务指标分析
                            </h3>
                            <p className="text-gray-600 text-base mb-6 text-center leading-relaxed">基于财务报表，AI 智能分析财务指标。</p>
                            <ul className="text-gray-500 text-sm list-disc pl-5 space-y-2">
                                <li>多文档智能分析</li>
                                <li>财务指标自动计算</li>
                                <li>支持校验 AI 计算结果</li>
                            </ul>
                        </div>
                        {/* 能力三 */}
                        <div
                            className={`bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center transition-all duration-300 group ${highlight ? "ring-4 ring-yellow-400 scale-[1.02]" : "shadow-sm hover:shadow-xl hover:-translate-y-2"
                                }`}
                        >
                            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-6 text-yellow-600 text-2xl group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                <FiCheckCircle />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                财务合规指导
                            </h3>
                            <p className="text-gray-600 text-base mb-6 text-center leading-relaxed">结合准则法规，AI 判断业务合规性。</p>
                            <ul className="text-gray-500 text-sm list-disc pl-5 space-y-2">
                                <li>法规/准则自由匹配</li>
                                <li>多文档联合分析</li>
                                <li>合规性建议输出</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* WHY GOODMAN */}
                <section className="bg-gray-50 rounded-3xl p-10 md:p-16 mt-20">
                    <h2 className="text-3xl font-bold mb-10 text-center">为什么选择 Goodman？</h2>
                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
                                <FiCheckCircle className="text-3xl text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-gray-900">专业可信</h3>
                            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">引用最新会计准则与法规，严谨可靠，杜绝虚假信息。</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
                                <FiZap className="text-3xl text-yellow-500" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-gray-900">极致效率</h3>
                            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">从上传到结果仅需数秒，支持批量处理，大幅提升工作效率。</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
                                <FiCpu className="text-3xl text-blue-500" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-gray-900">轻松集成</h3>
                            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">Serverless 架构，可轻松托管至 Vercel 或部署在企业私有云。</p>
                        </div>
                    </div>
                </section>

                {/* TECH FEATURES */}
                <section className="py-20 w-full">
                    <h3 className="text-2xl font-bold mb-10 text-center text-gray-800">技术特性</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors">
                            <div className="text-4xl mb-4 text-gray-400 flex justify-center"><FiCpu /></div>
                            <h4 className="font-bold text-gray-900 mb-2">AI 驱动</h4>
                            <p className="text-sm text-gray-500">基于 OpenAI gpt-5-mini 技术</p>
                        </div>
                        <div className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors">
                            <div className="text-4xl mb-4 text-gray-400 flex justify-center"><FiFolder /></div>
                            <h4 className="font-bold text-gray-900 mb-2">本地知识库</h4>
                            <p className="text-sm text-gray-500">引用会计准则、法律法规</p>
                        </div>
                        <div className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors">
                            <div className="text-4xl mb-4 text-gray-400 flex justify-center"><FiZap /></div>
                            <h4 className="font-bold text-gray-900 mb-2">扩展性强</h4>
                            <p className="text-sm text-gray-500">根据业务需求随时调整</p>
                        </div>
                        <div className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors">
                            <div className="text-4xl mb-4 text-gray-400 flex justify-center"><FiFeather /></div>
                            <h4 className="font-bold text-gray-900 mb-2">简单易用</h4>
                            <p className="text-sm text-gray-500">指引清晰，上手快速便捷</p>
                        </div>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="flex flex-col items-center text-center mt-10 mb-20 bg-yellow-50/50 rounded-3xl p-16">
                    <h3 className="text-3xl font-extrabold mb-8 text-gray-900">准备好让财务工作更 smart 吗？</h3>
                    <Link
                        href="/chat"
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 px-12 rounded-full shadow-lg hover:shadow-yellow-500/30 transition-all transform hover:-translate-y-1"
                    >
                        开始对话
                    </Link>
                </section>
            </PageContainer>
        </div>
    );
}
