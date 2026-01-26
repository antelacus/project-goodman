import React from 'react';
import {
  MessageSquare,
  Search,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl py-10 px-4">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-neutral-900">使用指南</h1>
        <p className="text-neutral-600">了解 Goodman 能为您做什么</p>
      </div>

      {/* Core Capabilities - Aligned with landing page */}
      <div className="grid gap-6 md:grid-cols-3 mb-16">
        {/* 数据信息检索 */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="text-yellow-600 bg-yellow-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
              <Search size={28} />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">数据信息检索</h3>
            <p className="text-sm text-neutral-600">
              智能检索财务数据与文档内容，支持语义搜索。
            </p>
          </div>
        </div>

        {/* 参数指标分析 */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="text-yellow-600 bg-yellow-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
              <Sparkles size={28} />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">参数指标分析</h3>
            <p className="text-sm text-neutral-600">
              自动计算财务指标，支持多期对比分析。
            </p>
          </div>
        </div>

        {/* 综合报告生成 */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="text-yellow-600 bg-yellow-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
              <FileText size={28} />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">综合报告生成</h3>
            <p className="text-sm text-neutral-600">
              整合数据与分析，生成结构化报告。
            </p>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <MessageSquare className="text-yellow-500" size={28} />
          使用示例
        </h2>
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100">
            <div className="p-5 hover:bg-neutral-50 transition-colors">
              <p className="font-medium text-neutral-900 mb-1">数据查询</p>
              <p className="text-sm text-neutral-500">&ldquo;查询公司2024年的流动比率&rdquo;</p>
            </div>
            <div className="p-5 hover:bg-neutral-50 transition-colors">
              <p className="font-medium text-neutral-900 mb-1">指标计算</p>
              <p className="text-sm text-neutral-500">&ldquo;帮我计算资产负债率和速动比率&rdquo;</p>
            </div>
            <div className="p-5 hover:bg-neutral-50 transition-colors">
              <p className="font-medium text-neutral-900 mb-1">文档检索</p>
              <p className="text-sm text-neutral-500">&ldquo;搜索关于收入确认的会计准则&rdquo;</p>
            </div>
            <div className="p-5 hover:bg-neutral-50 transition-colors">
              <p className="font-medium text-neutral-900 mb-1">报告生成</p>
              <p className="text-sm text-neutral-500">&ldquo;生成公司的财务分析报告&rdquo;</p>
            </div>
            <div className="p-5 hover:bg-neutral-50 transition-colors">
              <p className="font-medium text-neutral-900 mb-1">多期对比</p>
              <p className="text-sm text-neutral-500">&ldquo;对比2023年和2024年的盈利能力指标&rdquo;</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <HelpCircle className="text-yellow-500" size={28} />
          常见问题
        </h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-neutral-900 mb-2">AI 回答准确吗？</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Goodman 基于您上传的文档和数据进行分析，计算过程透明可追溯。对于法规查询，系统会引用具体条款来源。建议将 AI 输出作为参考，重要决策请结合专业判断。
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-neutral-900 mb-2">支持哪些文件格式？</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              系统支持 PDF、Excel（.xlsx/.xls）、Word（.docx）等常见格式。财务报表建议使用 Excel 格式以获得更精确的数据提取。
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-neutral-900 mb-2">如何获得更好的回答？</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              提问时尽量具体，包含公司名称、时间范围、具体指标等信息。例如，&ldquo;计算流动比率&rdquo;不如&ldquo;计算XX公司2024年Q3的流动比率&rdquo;效果好。
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500">
        <p>如有问题或建议，请通过侧栏&ldquo;联系我&rdquo;发送邮件。</p>
      </div>
    </div>
  );
}
