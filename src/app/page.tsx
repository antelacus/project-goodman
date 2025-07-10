import Image from "next/image";
import Link from "next/link";
import PageContainer from "../components/PageContainer";

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
        <strong>Goodman is the new kind of accounting.</strong><br />
          <br />
          Goodman 是一款面向财务与合规领域的智能 AI 助手，当前支持财务信息提取、财务指标分析、财务合规指导等三个核心功能。
        </div>
        {/* 模块导航 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-8">
          {/* 模块一 */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <Link href="/data-extract" className="text-xl font-bold text-black hover:text-yellow-500 transition-colors mb-2 cursor-pointer">
              模块一：财务信息提取
            </Link>
            <p className="text-gray-600 text-sm mb-2">上传财务文档，AI 自动提取关键信息。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>支持发票、合同等文件</li>
              <li>自动结构化关键信息</li>
              <li>便捷灵活复制信息</li>
            </ul>
          </div>
          {/* 模块二 */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <Link href="/financial-analysis" className="text-xl font-bold text-black hover:text-yellow-500 transition-colors mb-2 cursor-pointer">
              模块二：财务指标分析
            </Link>
            <p className="text-gray-600 text-sm mb-2">基于财务报表，AI 智能分析财务指标。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>多文档智能分析</li>
              <li>财务指标自动计算</li>
              <li>支持校验 AI 计算结果</li>
            </ul>
          </div>
          {/* 模块三 */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <Link href="/guidance-chat" className="text-xl font-bold text-black hover:text-yellow-500 transition-colors mb-2 cursor-pointer">
              模块三：财务合规指导
            </Link>
            <p className="text-gray-600 text-sm mb-2">结合准则法规，AI 判断业务合规性。</p>
            <ul className="text-gray-500 text-xs list-disc pl-5">
              <li>法规/准则自由匹配</li>
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
        </div>
      </div>
    </PageContainer>
  );
}
