"use client";
import React, { useState, useEffect } from "react";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import Image from "next/image";

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
                <div className="px-6 pb-6 flex flex-col gap-10">
                  {/* 第一张图片 靠左，右侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-start">
                      <Image src={require('../../../data/showcases/data-extract/1.png')} alt="演示1" width={400} height={260} className="rounded shadow" />
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                  </div>
                  {/* 第二张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end order-1 md:order-2">
                      <Image src={require('../../../data/showcases/data-extract/2.png')} alt="演示2" width={400} height={260} className="rounded shadow" />
                    </div>
                  </div>
                  {/* 第三张图片 靠左，右侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-start">
                      <Image src={require('../../../data/showcases/data-extract/3.png')} alt="演示3" width={400} height={260} className="rounded shadow" />
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                  </div>
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
                <div className="px-6 pb-6 flex flex-col gap-10">
                  {/* 第一张图片 靠左，右侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-start">
                      <Image src={require('../../../data/showcases/financial-analysis/1.png')} alt="分析演示1" width={400} height={260} className="rounded shadow" />
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                  </div>
                  {/* 第二张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end order-1 md:order-2">
                      <Image src={require('../../../data/showcases/financial-analysis/2.png')} alt="分析演示2" width={400} height={260} className="rounded shadow" />
                    </div>
                  </div>
                  {/* 第三张图片 靠左，右侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-start">
                      <Image src={require('../../../data/showcases/financial-analysis/3.png')} alt="分析演示3" width={400} height={260} className="rounded shadow" />
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                  </div>
                  {/* 第四张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end order-1 md:order-2">
                      <Image src={require('../../../data/showcases/financial-analysis/4.png')} alt="分析演示4" width={400} height={260} className="rounded shadow" />
                    </div>
                  </div>
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
                <div className="px-6 pb-6 flex flex-col gap-10">
                  {/* 第一张图片 靠左，右侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-start">
                      <Image src={require('../../../data/showcases/guidance-chat/1.png')} alt="合规演示1" width={400} height={260} className="rounded shadow" />
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                  </div>
                  {/* 第二张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end order-1 md:order-2">
                      <Image src={require('../../../data/showcases/guidance-chat/2.png')} alt="合规演示2" width={400} height={260} className="rounded shadow" />
                    </div>
                  </div>
                  {/* 第三张图片 靠左，右侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-start">
                      <Image src={require('../../../data/showcases/guidance-chat/3.png')} alt="合规演示3" width={400} height={260} className="rounded shadow" />
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                  </div>
                  {/* 第四张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">步骤说明</div>
                    </div>
                    <div className="md:w-1/2 w-full flex justify-end order-1 md:order-2">
                      <Image src={require('../../../data/showcases/guidance-chat/4.png')} alt="合规演示4" width={400} height={260} className="rounded shadow" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
} 