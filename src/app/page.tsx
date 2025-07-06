import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* 头部 */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Project Goodman
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            基于 AI 的智能财务助手，通过三个核心模块全面提升财务工作效率：
            智能文档处理、财务分析预测、合规性指导
          </p>
        </div>

        {/* 模块导航 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* 模块一 */}
          <Link href="/pdf-upload" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4">📄</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                模块一：智能文档分析
              </h2>
              <p className="text-gray-600 mb-6">
                自动提取文档中的财务信息，识别发票、合同等关键数据，生成结构化信息
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                开始使用
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 模块二 */}
          <Link href="/financial-analysis" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                模块二：财务分析与预测
              </h2>
              <p className="text-gray-600 mb-6">
                基于财务报表进行智能分析，提供财务预测和决策建议，支持多文档对比分析
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                开始使用
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 模块三 */}
          <Link href="/knowledge-chat" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                模块三：合规性指导
              </h2>
              <p className="text-gray-600 mb-6">
                基于财务准则和税务指南，为财务工作提供合规性建议和风险提示
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                开始使用
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* 技术特性 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            技术特性
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl mb-2">🤖</div>
              <h4 className="font-semibold text-gray-900 mb-2">AI 驱动</h4>
              <p className="text-sm text-gray-600">基于 OpenAI GPT-4o 和 Embedding 技术</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📁</div>
              <h4 className="font-semibold text-gray-900 mb-2">本地知识库</h4>
              <p className="text-sm text-gray-600">预处理的财务准则和税务指南</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-semibold text-gray-900 mb-2">实时处理</h4>
              <p className="text-sm text-gray-600">支持多种文档格式的实时分析</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🔒</div>
              <h4 className="font-semibold text-gray-900 mb-2">Vercel 部署</h4>
              <p className="text-sm text-gray-600">兼容免费版部署，无需额外配置</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
