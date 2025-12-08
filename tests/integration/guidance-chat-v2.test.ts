/**
 * Test Suite for Guidance Chat v2 API
 *
 * Tests hybrid search, citation extraction, and confidence scoring
 */

const TEST_GUIDANCE_CHAT_V2_API_URL = 'http://localhost:3000/api/guidance-chat-v2';

interface Citation {
  regulation: string;
  article: string;
  content: string;
  relevance: number;
}

interface RelatedArticle {
  regulation: string;
  article: string;
  summary: string;
}

interface GuidanceResponse {
  type: 'guidance' | 'not_found' | 'low_confidence';
  guidance?: string;
  citations: Citation[];
  confidence: number;
  relatedArticles?: RelatedArticle[];
  warnings?: string[];
}

async function testGuidanceChatV2API(
  testName: string,
  request: {
    question: string;
    uploadedDocument?: { text: string; fileName: string };
    regulationCategories?: string[];
  }
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`测试: ${testName}`);
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    const response = await fetch(TEST_GUIDANCE_CHAT_V2_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`\n状态码: ${response.status}`);
    console.log(`响应时间: ${responseTime}ms`);

    const data: GuidanceResponse = await response.json();

    console.log(`\n响应类型: ${data.type}`);
    console.log(`置信度: ${(data.confidence * 100).toFixed(1)}%`);

    if (data.guidance) {
      console.log('\n【指导建议】');
      console.log(data.guidance);
    }

    if (data.citations && data.citations.length > 0) {
      console.log('\n【引用法规】');
      data.citations.forEach((citation, index) => {
        console.log(`\n引用 ${index + 1}:`);
        console.log(`  法规: ${citation.regulation}`);
        console.log(`  条款: ${citation.article}`);
        console.log(`  相关度: ${(citation.relevance * 100).toFixed(1)}%`);
        console.log(`  内容摘要: ${citation.content.substring(0, 100)}...`);
      });
    } else {
      console.log('\n【引用法规】: 无');
    }

    if (data.relatedArticles && data.relatedArticles.length > 0) {
      console.log('\n【相关条款】');
      data.relatedArticles.forEach((article, index) => {
        console.log(`  ${index + 1}. ${article.regulation} - ${article.article}`);
        console.log(`     ${article.summary}`);
      });
    }

    if (data.warnings && data.warnings.length > 0) {
      console.log('\n【重要提示】');
      data.warnings.forEach((warning, index) => {
        console.log(`  ⚠️ ${index + 1}. ${warning}`);
      });
    }

    return { success: true, data, responseTime };
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return { success: false, error };
  }
}

async function runAllGuidanceChatV2Tests() {
  console.log('\n' + '█'.repeat(80));
  console.log('  Guidance Chat v2 API 测试套件');
  console.log('█'.repeat(80));

  const results: any[] = [];

  // Test 1: Tax rate inquiry (should find VAT regulations)
  results.push(
    await testGuidanceChatV2API('Context-Aware Question (with document)', {
      question: '软件产品的增值税税率是多少？',
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Complex tax policy question
  results.push(
    await testGuidanceChatV2API('测试 2: 复杂税收优惠政策', {
      question: '我们公司销售自主研发的软件产品，听说可以享受增值税即征即退政策，请问有什么条件？',
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Accounting standards inquiry
  results.push(
    await testGuidanceChatV2API('测试 8: 性能测试', {
      question: '无形资产的确认条件是什么？',
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Inquiry with uploaded contract
  results.push(
    await testGuidanceChatV2API('测试 4: 带上下文的问题', {
      question: '这份合同需要缴纳什么税？税率是多少？',
      uploadedDocument: {
        text: '软件开发服务合同\n\n甲方：某科技公司\n乙方：某软件开发公司\n\n合同金额：人民币100万元\n服务内容：为甲方开发定制化财务管理系统软件\n交付期限：6个月',
        fileName: '软件开发合同.txt',
      },
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 5: Vague question (should return low confidence or not found)
  results.push(
    await testGuidanceChatV2API('测试 5: 模糊问题', {
      question: '公司需要交税吗？',
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 6: Non-existent regulation (should return not_found)
  results.push(
    await testGuidanceChatV2API('测试 6: 错误处理', {
      question: '火星进口商品的关税政策是什么？',
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 7: Specific article inquiry
  results.push(
    await testGuidanceChatV2API('测试 7: 边界情况', {
      question: '增值税法第十三条的具体内容是什么？',
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 8: Empty question (should return error)
  results.push(
    await testGuidanceChatV2API('测试 5: 英文问题', {
      question: '',
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 9: Corporate income tax inquiry
  results.push(
    await testGuidanceChatV2API('测试 9: 企业所得税查询', {
      question: '研发费用可以加计扣除吗？比例是多少？',
    })
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 10: Invoice-related question
  results.push(
    await testGuidanceChatV2API('测试 10: 综合测试', {
      question: '什么情况下可以开具增值税专用发票？',
    })
  );

  // Summary
  console.log('\n\n' + '█'.repeat(80));
  console.log('  测试总结');
  console.log('█'.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n总测试数: ${results.length}`);
  console.log(`✅ 成功: ${successful}`);
  console.log(`❌ 失败: ${failed}`);

  if (successful > 0) {
    const avgResponseTime =
      results
        .filter(r => r.success && r.responseTime)
        .reduce((sum, r) => sum + r.responseTime, 0) / successful;

    console.log(`\n平均响应时间: ${avgResponseTime.toFixed(0)}ms`);
  }

  const guidanceResponses = results.filter(
    r => r.success && r.data?.type === 'guidance'
  ).length;
  const notFoundResponses = results.filter(
    r => r.success && r.data?.type === 'not_found'
  ).length;
  const lowConfidenceResponses = results.filter(
    r => r.success && r.data?.type === 'low_confidence'
  ).length;

  console.log('\n响应类型分布:');
  console.log(`  guidance: ${guidanceResponses}`);
  console.log(`  not_found: ${notFoundResponses}`);
  console.log(`  low_confidence: ${lowConfidenceResponses}`);

  console.log('\n');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch {
    return false;
  }
}

// Main execution
(async () => {
  console.log('检查开发服务器...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('❌ 开发服务器未运行！');
    console.log('请先运行: npm run dev');
    process.exit(1);
  }

  console.log('✅ 开发服务器正在运行\n');

  await runAllTests();
})();
