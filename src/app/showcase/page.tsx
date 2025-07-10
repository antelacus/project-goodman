"use client";
import React, { useState, useEffect } from "react";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";

export default function ShowcasePage() {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen(open === key ? null : key);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (['extract', 'analysis', 'guidance'].includes(hash)) {
        setOpen(hash);
        // 滚动到对应section
        const el = document.getElementById(hash);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
      }
    }
  }, []);
  return (
    <PageContainer maxWidth="6xl">
      <div className="flex flex-col gap-8">
        <section className="w-full">
          <PageTitle>展示案例</PageTitle>
          <p className="text-gray-700 mb-6">本页面将集中展示各功能模块的典型案例，便于演示和说明产品能力。</p>
          <div className="space-y-4">
            {/* 财务信息提取 */}
            <div className="border rounded-lg" id="extract">
              <button
                className="w-full flex justify-between items-center px-6 py-4 text-lg font-semibold text-left focus:outline-none hover:bg-gray-50 transition-colors"
                onClick={() => toggle('extract')}
                aria-expanded={open === 'extract'}
              >
                财务信息提取
                <span className={`ml-2 transition-transform ${open === 'extract' ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {open === 'extract' && (
                <div className="px-6 pb-6">
                  {/* 内容留空，待补充 */}
                </div>
              )}
            </div>
            {/* 财务指标分析 */}
            <div className="border rounded-lg" id="analysis">
              <button
                className="w-full flex justify-between items-center px-6 py-4 text-lg font-semibold text-left focus:outline-none hover:bg-gray-50 transition-colors"
                onClick={() => toggle('analysis')}
                aria-expanded={open === 'analysis'}
              >
                财务指标分析
                <span className={`ml-2 transition-transform ${open === 'analysis' ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {open === 'analysis' && (
                <div className="px-6 pb-6">
                  {/* 内容留空，待补充 */}
                </div>
              )}
            </div>
            {/* 财务合规指导 */}
            <div className="border rounded-lg" id="guidance">
              <button
                className="w-full flex justify-between items-center px-6 py-4 text-lg font-semibold text-left focus:outline-none hover:bg-gray-50 transition-colors"
                onClick={() => toggle('guidance')}
                aria-expanded={open === 'guidance'}
              >
                财务合规指导
                <span className={`ml-2 transition-transform ${open === 'guidance' ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {open === 'guidance' && (
                <div className="px-6 pb-6">
                  {/* 内容留空，待补充 */}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
} 