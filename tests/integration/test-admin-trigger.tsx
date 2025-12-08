/**
 * Test file for AdminPasswordTrigger component
 *
 * This is a manual test component. To test:
 * 1. Create a temporary test page: src/app/test-admin/page.tsx
 * 2. Copy this content there
 * 3. Run: npm run dev
 * 4. Visit: http://localhost:3000/test-admin
 * 5. Triple-click the file icon
 * 6. Enter admin password (from .env.local)
 * 7. Verify authentication works
 */

'use client';

import { useAdminAuth, getAdminToken, isAdminAuthenticated } from '../../src/components/AdminPasswordTrigger';
import { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiFileText } from 'react-icons/fi';

export default function TestAdminTrigger() {
  const { triggerRef, isAuthenticated, logout, modal } = useAdminAuth();
  const [uploadStatus, setUploadStatus] = useState('');

  const handleTestUpload = async () => {
    const token = getAdminToken();
    if (!token) {
      setUploadStatus('未认证：无法获取 token');
      return;
    }

    setUploadStatus('测试中...');

    try {
      // Test document upload with admin authentication
      const testDocument = `资产负债表

流动资产：
  货币资金：1,000,000.00 元
  应收账款：500,000.00 元
  存货：300,000.00 元
  流动资产合计：1,800,000.00 元

非流动资产：
  固定资产：2,000,000.00 元
  非流动资产合计：2,000,000.00 元

资产总计：3,800,000.00 元

流动负债：
  短期借款：400,000.00 元
  应付账款：200,000.00 元
  流动负债合计：600,000.00 元

非流动负债：
  长期借款：500,000.00 元
  非流动负债合计：500,000.00 元

负债总计：1,100,000.00 元

所有者权益：
  实收资本：2,000,000.00 元
  盈余公积：200,000.00 元
  未分配利润：500,000.00 元
  所有者权益合计：2,700,000.00 元

负债和所有者权益总计：3,800,000.00 元`;

      const response = await fetch('/api/admin/upload-database-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: testDocument,
          fileName: '测试资产负债表-' + Date.now() + '.txt',
          documentType: 'balance_sheet',
          year: '2024',
          period: 'annual',
          adminPassword: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '', // In real app, use token
          metadata: {
            company: '测试公司',
            test: true,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUploadStatus(`[SUCCESS] 上传成功！提取了 ${data.structuredData?.metrics?.length || 0} 个指标`);
      } else {
        setUploadStatus(`[ERROR] 上传失败：${data.message || '未知错误'}`);
      }
    } catch (error) {
      setUploadStatus(`[ERROR] 请求失败：${error}`);
      console.error('Upload test error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          AdminPasswordTrigger 组件测试
        </h1>

        {/* Trigger Element */}
        <div className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            步骤 1: 三击触发
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            快速点击下面的图标三次以触发管理员密码输入框
          </p>
          <div
            ref={triggerRef}
            className="inline-block text-4xl cursor-pointer hover:scale-110 transition-transform p-4 bg-white rounded-lg shadow"
          >
            <FiFileText />
          </div>
        </div>

        {/* Authentication Status */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            步骤 2: 认证状态
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">状态:</span>
              <span
                className={`px-3 py-1 rounded ${isAuthenticated
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                  }`}
              >
                {isAuthenticated ? <><FiCheckCircle className="inline mr-1" />已认证</> : <><FiXCircle className="inline mr-1" />未认证</>}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Token:</span>
              <code className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-800">
                {getAdminToken()?.substring(0, 20) || 'null'}...
              </code>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">函数检查:</span>
              <span
                className={`px-3 py-1 rounded ${isAdminAuthenticated()
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                  }`}
              >
                {isAdminAuthenticated() ? 'true' : 'false'}
              </span>
            </div>

            {isAuthenticated && (
              <button
                onClick={logout}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-medium"
              >
                登出
              </button>
            )}
          </div>
        </div>

        {/* Test Admin API */}
        {isAuthenticated && (
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">
              步骤 3: 测试管理员 API
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              测试上传文档到数据库（需要管理员权限）
            </p>
            <button
              onClick={handleTestUpload}
              disabled={!isAuthenticated}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              测试上传文档
            </button>
            {uploadStatus && (
              <p className="mt-4 text-sm text-gray-700">{uploadStatus}</p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="p-6 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            测试说明
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>快速点击文件图标三次（500ms 内）</li>
            <li>应该会弹出管理员密码输入框</li>
            <li>输入密码（来自 .env.local 的 ADMIN_PASSWORD）</li>
            <li>点击"解锁"按钮</li>
            <li>验证成功后，"认证状态"应显示为"已认证"</li>
            <li>Token 应显示为 64 字符的十六进制字符串</li>
            <li>点击"测试上传文档"按钮测试管理员 API</li>
            <li>点击"登出"按钮测试登出功能</li>
          </ol>
        </div>
      </div>

      {/* Modal rendered here */}
      {modal}
    </div>
  );
}
