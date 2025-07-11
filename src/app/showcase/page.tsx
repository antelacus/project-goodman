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
          <PageTitle>案例演示</PageTitle>
          <p className="text-gray-700 mb-6">本页面集中展示各功能模块的典型案例。</p>
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
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                        该功能模块当前仅支持上传小于1MB的电子版PDF文件，请在使用前检查待处理文档。
                      </div>
                    </div>
                  </div>
                  {/* 第二张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      使用时，请点击文档上传框后选择本地文档，文档上传完成后会自动出现在第二步中。确认文档选择后，点击”分析“按钮，等待 AI 提取文档信息。<br />
                      <br />
                      （如需选择已上传的其他文档，可以点击“文档选择”按钮后在弹窗中选择。点击弹窗以外区域会关闭弹窗。）<br />
                      </div>
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
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      AI 会格式化输出分析结果。点击需要的结果右上角的选项按钮，即可选择以不同的方式（标题/内容/全部）复制分析结果。
                      </div>
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
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      请首先点击左下角“文档选择”按钮，在弹窗中选择想要分析的文档，可多选。<br />
                      <br />
                      (出于演示目的，该功能模块当前仅支持使用已有数据库文档。点击弹窗以外区域会关闭弹窗。)
                      </div>
                    </div>
                  </div>
                  {/* 第二张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      该功能模块已内置部分常用财务分析问题，可点击“预设提问”按钮使用（点击弹窗以外区域即可关闭弹窗），亦可直接输入想要询问的问题。点击“发送”按钮后，等待 AI 根据选择的数据库文档回答问题。
                      </div>
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
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      当前的主流 AI 模型无法实现真正的数学计算，因此回答中的数学计算过程及结果会被高亮显示以提醒留意。
                      </div>
                    </div>
                  </div>
                  {/* 第四张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      点击被高亮显示的数学计算过程后会出现弹窗，其中显示了对 AI 数学计算的校验。可据此判断 AI 的计算过程和结果是否正确。
                      </div>
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
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      请首先点击左下角“文档选择”按钮，在弹窗中选择想要用作指引的数据库文档和用作分析对象的待处理文档，可多选。如所需待处理文档尚未上传，此处可点击“上传文档”补充上传。<br />
                      <br />
                      (出于演示目的，该功能模块当前仅支持使用已有数据库文档。点击弹窗以外区域会关闭弹窗。)
                      </div>
                    </div>
                  </div>
                  {/* 第二张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      该功能模块已内置部分常用财务合规问题，可点击“预设提问”按钮使用（点击弹窗以外区域即可关闭弹窗），亦可直接输入想要询问的问题。点击“发送”按钮后，等待 AI 根据选择的数据库文档和待处理文档回答问题。
                      </div>
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
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      当前的主流 AI 模型无法实现真正的数学计算，因此回答中的数学计算过程及结果会被高亮显示以提醒留意。
                      </div>
                    </div>
                  </div>
                  {/* 第四张图片 靠右，左侧说明 */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                      <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                      点击被高亮显示的数学计算过程后会出现弹窗，其中显示了对 AI 数学计算的校验。可据此判断 AI 的计算过程和结果是否正确。
                      </div>
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