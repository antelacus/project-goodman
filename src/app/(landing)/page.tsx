"use client";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { CheckCircle, Zap, TrendingUp, FileText } from "lucide-react";

export default function HomePage() {
    const featureRef = useRef<HTMLDivElement | null>(null);
    const [highlight, setHighlight] = useState(false);

    const handleExperienceClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (featureRef.current) {
            const y = featureRef.current.getBoundingClientRect().top + window.pageYOffset - 80;
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
        <div className="flex flex-col min-h-screen bg-white text-gray-900 relative selection:bg-yellow-100">
            <div className="bg-dot-pattern absolute inset-0 -z-10 h-[80vh] mask-image-gradient opacity-40" />

            <PageContainer maxWidth="7xl">
                {/* HERO SECTION */}
                <section className="flex flex-col items-center justify-center min-h-[85vh] text-center pt-20">
                    <div className="mb-8 animate-in zoom-in duration-700">
                        <Image src="/logo.png" alt="Project Goodman Logo" width={180} height={180} priority className="rounded-2xl" />
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 animate-in slide-in-from-bottom-4 duration-700 delay-100">
                        新一代财务 <span className="text-yellow-500 relative inline-block">
                            AI
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-yellow-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                            </svg>
                        </span> 合作伙伴
                    </h1>

                    <p className="mt-4 text-2xl font-serif text-gray-600 italic opacity-90 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                        Goodman is the new kind of accounting.
                    </p>

                    <p className="max-w-2xl mt-8 text-lg text-gray-500 leading-relaxed animate-in slide-in-from-bottom-4 duration-700 delay-300">
                        专为财务领域打造，集数据查询与文档检索、指标分析与报告生成于一体的 agent。
                        <br />
                        让繁琐的财务工作变为简单的自然对话。
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 mt-12 animate-in slide-in-from-bottom-8 duration-700 delay-500">
                        <Link
                            href="/chat"
                            className="group bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 flex items-center gap-2"
                        >
                            <Zap size={20} className="text-yellow-400 group-hover:animate-pulse" />
                            开始使用
                        </Link>
                        <Link
                            href="#core-modules"
                            onClick={handleExperienceClick}
                            className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-bold py-4 px-10 rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center"
                        >
                            了解更多
                        </Link>
                    </div>
                </section>

                {/* CORE MODULES */}
                <section id="core-modules" ref={featureRef} className="py-24 scroll-mt-20">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900">三大核心能力</h2>
                        <div className="w-24 h-1.5 bg-yellow-500 mx-auto mt-6 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full px-4">
                        {/* 数据信息检索 */}
                        <div
                            className={`bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center transition-all duration-300 group ${highlight ? "ring-4 ring-yellow-400 scale-[1.02]" : "shadow-sm hover:shadow-2xl hover:-translate-y-2"}`}
                        >
                            <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mb-6 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-colors duration-300">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">数据信息检索</h3>
                            <p className="text-gray-500 text-base mb-6 text-center leading-relaxed">agent 自动检索数据库中的财务数据，并支持文档内容的语义搜索。</p>
                        </div>

                        {/* 参数指标分析 */}
                        <div
                            className={`bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center transition-all duration-300 group ${highlight ? "ring-4 ring-yellow-400 scale-[1.02]" : "shadow-sm hover:shadow-2xl hover:-translate-y-2"}`}
                        >
                            <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mb-6 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-colors duration-300">
                                <TrendingUp size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">参数指标分析</h3>
                            <p className="text-gray-500 text-base mb-6 text-center leading-relaxed">基于财务报表数据，agent 智能计算各类财务指标，支持多期对比分析。</p>
                        </div>

                        {/* 综合报告生成 */}
                        <div
                            className={`bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center transition-all duration-300 group ${highlight ? "ring-4 ring-yellow-400 scale-[1.02]" : "shadow-sm hover:shadow-2xl hover:-translate-y-2"}`}
                        >
                            <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mb-6 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-colors duration-300">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">综合报告生成</h3>
                            <p className="text-gray-500 text-base mb-6 text-center leading-relaxed">整合检索结果与分析数据，agent 自动生成结构化的综合分析报告。</p>
                        </div>
                    </div>
                </section>

                {/* WHY GOODMAN */}
                <section className="bg-white border border-gray-100 rounded-[2.5rem] p-10 md:p-20 mt-10 text-gray-900">
                    <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center">为什么选择 Goodman？</h2>
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold mb-4 text-yellow-600">专业可信</h3>
                            <p className="text-gray-500 leading-relaxed">引用最新会计准则与法规，严谨可靠，杜绝虚假信息。</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold mb-4 text-yellow-600">极致效率</h3>
                            <p className="text-gray-500 leading-relaxed">通过自然语言完成数据和信息检索，参数指标分析以及自动生成财务分析报告。</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold mb-4 text-yellow-600">轻松集成</h3>
                            <p className="text-gray-500 leading-relaxed">现代化架构，可轻松托管或私有化部署，数据安全无忧。</p>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="py-12 mt-12 text-center text-gray-400 text-sm">
                    <p>© 2026 Project Goodman. All rights reserved.</p>
                </footer>
            </PageContainer>
        </div>
    );
}
