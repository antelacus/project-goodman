import Image from "next/image";
import Link from "next/link";
import PageContainer from "../components/PageContainer";
import PageTitle from "../components/PageTitle";

export default function HomePage() {
  return (
    <PageContainer maxWidth="6xl">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        {/* 居中Logo标题 */}
        <div className="flex justify-center items-center mt-0 mb-4">
          <Image src="/logo.png" alt="Project Goodman Logo" width={240} height={240} priority />
        </div>
        {/* 项目简介 */}
        <div className="text-center text-lg text-gray-700 mb-6">
          Project Goodman 是一款面向财务与合规领域的智能AI助手，支持智能文档分析、财务分析与预测、合规性指导等核心功能。
        </div>
        {/* 模块导航 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-8">
          {/* 模块一 */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <Link href="/data-extract" className="text-xl font-bold text-black hover:text-yellow-500 transition-colors mb-2 cursor-pointer">
              模块一：智能文档分析
            </Link>
            <p className="text-gray-600 text-sm mb-2">上传PDF财务文档，AI自动提取关键信息。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>支持发票、合同等PDF</li>
              <li>自动结构化关键信息</li>
              <li>AI智能分析</li>
            </ul>
          </div>
          {/* 模块二 */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <Link href="/financial-analysis" className="text-xl font-bold text-black hover:text-yellow-500 transition-colors mb-2 cursor-pointer">
              模块二：财务分析与预测
            </Link>
            <p className="text-gray-600 text-sm mb-2">基于知识型文档，AI智能分析财务指标与趋势。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>多文档智能分析</li>
              <li>财务指标自动计算</li>
              <li>支持LaTeX公式校验</li>
            </ul>
          </div>
          {/* 模块三 */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <Link href="/guidance-chat" className="text-xl font-bold text-black hover:text-yellow-500 transition-colors mb-2 cursor-pointer">
              模块三：合规性指导
            </Link>
            <p className="text-gray-600 text-sm mb-2">结合知识型和业务型文档，AI判断业务合规性。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>法规/准则智能匹配</li>
              <li>多文档联合分析</li>
              <li>合规性建议输出</li>
            </ul>
          </div>
        </div>
        {/* 技术特性 */}
        <div className="bg-white rounded-lg p-8 mt-12 w-full">
          <h3 className="text-2xl font-bold mb-6 text-center">技术特性</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl mb-2">🤖</div>
              <h4 className="font-semibold mb-2">AI 驱动</h4>
              <p className="text-sm text-gray-700">基于 OpenAI GPT-4o 和 Embedding 技术</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📁</div>
              <h4 className="font-semibold mb-2">本地知识库</h4>
              <p className="text-sm text-gray-700">预处理的财务准则和税务指南</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-semibold mb-2">实时处理</h4>
              <p className="text-sm text-gray-700">支持多种文档格式的实时分析</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🔒</div>
              <h4 className="font-semibold mb-2">Vercel 部署</h4>
              <p className="text-sm text-gray-700">兼容免费版部署，无需额外配置</p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
