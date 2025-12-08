"use client";
import React, { useState, useEffect } from "react";
import PageContainer from "../../components/PageContainer";
import PageTitle from "../../components/PageTitle";
import Image from "next/image";
import Link from "next/link";

export default function HelpPage() {
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleTutorial = (key: string) => setOpenTutorial(openTutorial === key ? null : key);
  const toggleFaq = (key: string) => setOpenFaq(openFaq === key ? null : key);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (['extract', 'analysis', 'guidance'].includes(hash)) {
        setOpenTutorial(hash);
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
          <PageTitle>使用指南</PageTitle>
          <p className="text-gray-700 mb-8">
            本页面提供各功能模块的使用教程与常见问题解答。
          </p>

          {/* TUTORIALS */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">功能教程</h2>
            <div className="space-y-4">
              {/* 财务信息提取 */}
              <div className="border rounded-lg" id="extract">
                <button
                  className="w-full flex justify-between items-center px-6 py-4 text-lg font-semibold text-left focus:outline-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggleTutorial('extract')}
                  aria-expanded={openTutorial === 'extract'}
                >
                  财务信息提取
                  <span className={`ml-2 transition-transform ${openTutorial === 'extract' ? 'rotate-90' : ''}`}>▶</span>
                </button>
                {openTutorial === 'extract' && (
                  <div className="px-6 pb-6 flex flex-col gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-start">
                        <Image src={require('../../../data/showcases/data-extract/1.png')} alt="演示1" width={400} height={260} className="rounded shadow" />
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          支持上传 PDF 或图片文件（PNG、JPG、WEBP、GIF），文件大小不超过 2MB。点击上传区域或直接拖拽文件即可上传。
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          文件上传后，系统会自动进行 AI 分析，从文档中提取关键信息并以结构化形式展示。
                        </div>
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end order-1 md:order-2">
                        <Image src={require('../../../data/showcases/data-extract/2.png')} alt="演示2" width={400} height={260} className="rounded shadow" />
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-start">
                        <Image src={require('../../../data/showcases/data-extract/3.png')} alt="演示3" width={400} height={260} className="rounded shadow" />
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          提取结果以卡片形式展示。点击每项右上角的菜单按钮，可选择复制标题、内容或完整信息，方便粘贴到其他应用中使用。
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
                  onClick={() => toggleTutorial('analysis')}
                  aria-expanded={openTutorial === 'analysis'}
                >
                  财务指标分析
                  <span className={`ml-2 transition-transform ${openTutorial === 'analysis' ? 'rotate-90' : ''}`}>▶</span>
                </button>
                {openTutorial === 'analysis' && (
                  <div className="px-6 pb-6 flex flex-col gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-start">
                        <Image src={require('../../../data/showcases/financial-analysis/1.png')} alt="分析演示1" width={400} height={260} className="rounded shadow" />
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          点击左下角「文档选择」按钮，从数据库文档中选择要分析的财务报表，支持多选。选中的文档将作为 AI 分析的数据来源。
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          在输入框中输入您的问题，或点击「预设提问」使用内置的常用财务分析问题。点击发送后，AI 将基于选中的文档进行分析并回答。
                        </div>
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end order-1 md:order-2">
                        <Image src={require('../../../data/showcases/financial-analysis/2.png')} alt="分析演示2" width={400} height={260} className="rounded shadow" />
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-start">
                        <Image src={require('../../../data/showcases/financial-analysis/3.png')} alt="分析演示3" width={400} height={260} className="rounded shadow" />
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          回答中涉及数学计算的部分会被高亮标记。这是因为 AI 的数学计算可能存在误差，高亮提醒您留意验证。
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          点击高亮的计算内容，系统会展示详细的计算校验结果：包括使用的公式、原始数据和重新计算的结果，帮助您判断 AI 计算是否准确。
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
                  onClick={() => toggleTutorial('guidance')}
                  aria-expanded={openTutorial === 'guidance'}
                >
                  财务合规指导
                  <span className={`ml-2 transition-transform ${openTutorial === 'guidance' ? 'rotate-90' : ''}`}>▶</span>
                </button>
                {openTutorial === 'guidance' && (
                  <div className="px-6 pb-6 flex flex-col gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-start">
                        <Image src={require('../../../data/showcases/guidance-chat/1.png')} alt="合规演示1" width={400} height={260} className="rounded shadow" />
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          点击左下角「文档选择」按钮，选择要参考的法规准则（数据库文档）和要分析的业务文档（待处理文档）。如需上传新的待处理文档，可在弹窗中点击「上传文档」。
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          在输入框中描述您的合规问题，或点击「预设提问」选择常见问题。AI 将结合法规条款和业务文档内容，给出合规性分析和建议。
                        </div>
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end order-1 md:order-2">
                        <Image src={require('../../../data/showcases/guidance-chat/2.png')} alt="合规演示2" width={400} height={260} className="rounded shadow" />
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-start">
                        <Image src={require('../../../data/showcases/guidance-chat/3.png')} alt="合规演示3" width={400} height={260} className="rounded shadow" />
                      </div>
                      <div className="md:w-1/2 w-full flex justify-end">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          AI 的回答会引用具体的法规条款作为依据。点击引用标记可查看原文内容，确保建议有据可循。
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="md:w-1/2 w-full flex justify-end order-2 md:order-1">
                        <div className="w-full md:w-11/12 min-h-[100px] flex items-center text-base text-gray-700 px-1 py-2">
                          如回答中涉及数值计算，同样会高亮显示。点击可查看计算校验详情，验证结果的准确性。
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
          </div>

          {/* FAQ */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">常见问题</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg shadow">
                <button
                  className="w-full flex justify-between items-center p-4 text-left font-semibold focus:outline-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFaq('faq1')}
                >
                  我无法获得 AI 回答？
                  <span className={`ml-2 transition-transform ${openFaq === 'faq1' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === 'faq1' && (
                  <div className="px-4 pb-4 text-gray-700">
                    该项目使用 OpenAI API 提供 AI 能力。如无法获得回答，请检查网络环境是否能正常访问 OpenAI 服务。
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow">
                <button
                  className="w-full flex justify-between items-center p-4 text-left font-semibold focus:outline-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFaq('faq2')}
                >
                  我上传的文档是否会泄露？
                  <span className={`ml-2 transition-transform ${openFaq === 'faq2' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === 'faq2' && (
                  <div className="px-4 pb-4 text-gray-700">
                    待处理文档仅在会话期间临时存储，用于 AI 分析。会话结束后文档会被自动清理。数据库文档由管理员管理，普通用户无法上传或下载。
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow">
                <button
                  className="w-full flex justify-between items-center p-4 text-left font-semibold focus:outline-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFaq('faq3')}
                >
                  AI 的回答可信吗？
                  <span className={`ml-2 transition-transform ${openFaq === 'faq3' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === 'faq3' && (
                  <div className="px-4 pb-4 text-gray-700">
                    Goodman 采用多项技术提升回答可靠性：数学计算由代码执行而非 AI 生成、法规引用来自知识库而非模型记忆。但 AI 技术本身存在局限，请结合专业判断使用。
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow">
                <button
                  className="w-full flex justify-between items-center p-4 text-left font-semibold focus:outline-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFaq('faq4')}
                >
                  支持哪些文件格式？
                  <span className={`ml-2 transition-transform ${openFaq === 'faq4' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === 'faq4' && (
                  <div className="px-4 pb-4 text-gray-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>财务信息提取</strong>：电子版 PDF（小于 1MB）</li>
                      <li><strong>数据库上传（管理员）</strong>：PDF、图片（PNG/JPG/JPEG/WEBP/GIF）、Excel（.xlsx，单工作表）</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow">
                <button
                  className="w-full flex justify-between items-center p-4 text-left font-semibold focus:outline-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFaq('faq5')}
                >
                  遇到问题如何反馈？
                  <span className={`ml-2 transition-transform ${openFaq === 'faq5' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === 'faq5' && (
                  <div className="px-4 pb-4 text-gray-700">
                    请通过导航栏的邮箱联系作者，描述您遇到的问题和使用场景，我们会尽快回复。
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LINK TO ABOUT */}
          <section className="text-center mb-8 p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              想了解更多关于项目背景和作者？请访问
              <Link href="/about" className="text-yellow-600 hover:text-yellow-700 font-semibold ml-1">
                关于页面
              </Link>
            </p>
          </section>
        </section>
      </div>
    </PageContainer>
  );
}
