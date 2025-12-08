/**
 * Test script for landing chat API
 * Tests the conversational routing functionality
 */

import { getLandingPagePrompt } from './src/lib/prompts';
import { buildRoutingConfidence } from './src/lib/confidence-scoring';

console.log('='.repeat(60));
console.log('Testing Landing Chat Components');
console.log('='.repeat(60));

// Test 1: Prompt generation
console.log('\n📝 Test 1: Prompt Generation');
console.log('-'.repeat(60));

const conversationHistory = [
  { role: 'user' as const, content: '你好' },
  { role: 'assistant' as const, content: '您好！我是您的AI财务助手。' },
];

const userMessage = '我想计算资产负债率';

try {
  const prompt = getLandingPagePrompt(conversationHistory, userMessage);
  console.log('✅ Prompt generated successfully');
  console.log(`Length: ${prompt.length} characters`);
  console.log(`Contains user message: ${prompt.includes(userMessage) ? '✅' : '❌'}`);
  console.log(`Contains conversation history: ${prompt.includes('你好') ? '✅' : '❌'}`);
} catch (error) {
  console.error('❌ Prompt generation failed:', error);
}

// Test 2: Confidence scoring for routing
console.log('\n📊 Test 2: Confidence Scoring for Routing');
console.log('-'.repeat(60));

const testCases = [
  {
    name: 'Clear financial analysis intent',
    metrics: {
      intentClarity: 0.9,
      moduleMatch: 1.0,
      contextCompleteness: 0.8,
    },
    expectedPass: true,
  },
  {
    name: 'Unclear intent',
    metrics: {
      intentClarity: 0.3,
      moduleMatch: 0.0,
      contextCompleteness: 0.6,
    },
    expectedPass: false,
  },
  {
    name: 'Moderate confidence',
    metrics: {
      intentClarity: 0.6,
      moduleMatch: 0.8,
      contextCompleteness: 0.7,
    },
    expectedPass: true,
  },
];

testCases.forEach((testCase, index) => {
  console.log(`\nTest Case ${index + 1}: ${testCase.name}`);
  try {
    const score = buildRoutingConfidence(testCase.metrics);
    console.log(`  Overall Confidence: ${(score.overall * 100).toFixed(2)}%`);
    console.log(`  Pass Threshold: ${score.pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Expected: ${testCase.expectedPass ? 'PASS' : 'FAIL'}`);

    if (score.pass === testCase.expectedPass) {
      console.log('  ✅ Test result matches expectation');
    } else {
      console.log('  ❌ Test result does NOT match expectation');
    }

    console.log('  Metrics breakdown:');
    score.metrics.forEach(metric => {
      console.log(`    - ${metric.name}: ${(metric.value * 100).toFixed(2)}% (weight: ${metric.weight})`);
    });
  } catch (error) {
    console.error('  ❌ Confidence scoring failed:', error);
  }
});

// Test 3: Module routing logic
console.log('\n🧭 Test 3: Module Routing Logic');
console.log('-'.repeat(60));

const routingTests = [
  {
    userMessage: '我想计算资产负债率',
    expectedModule: 'financial-analysis',
  },
  {
    userMessage: '帮我提取这份PDF的数据',
    expectedModule: 'data-extract',
  },
  {
    userMessage: '增值税税率是多少',
    expectedModule: 'guidance-chat',
  },
  {
    userMessage: '你好',
    expectedModule: null, // No clear module
  },
];

routingTests.forEach((test, index) => {
  console.log(`\nRouting Test ${index + 1}: "${test.userMessage}"`);
  console.log(`  Expected Module: ${test.expectedModule || 'None'}`);

  // Keyword detection simulation
  const lowerMessage = test.userMessage.toLowerCase();

  const extractionKeywords = ['提取', '读取', 'pdf', 'excel', '解析', '上传', '文档分析'];
  const analysisKeywords = ['计算', '分析', '指标', '比率', 'roe', 'roa', '资产负债率', '净利率', '毛利率', '周转率'];
  const guidanceKeywords = ['税', '合规', '法规', '政策', '增值税', '企业所得税', '会计准则', '规定'];

  const extractionScore = extractionKeywords.filter(k => lowerMessage.includes(k)).length;
  const analysisScore = analysisKeywords.filter(k => lowerMessage.includes(k)).length;
  const guidanceScore = guidanceKeywords.filter(k => lowerMessage.includes(k)).length;

  console.log(`  Scores: Extract=${extractionScore}, Analysis=${analysisScore}, Guidance=${guidanceScore}`);

  let detectedModule = null;
  if (extractionScore >= 2) detectedModule = 'data-extract';
  else if (analysisScore >= 2) detectedModule = 'financial-analysis';
  else if (guidanceScore >= 2) detectedModule = 'guidance-chat';

  console.log(`  Detected Module: ${detectedModule || 'None'}`);

  if (detectedModule === test.expectedModule) {
    console.log('  ✅ Routing is correct');
  } else {
    console.log('  ⚠️  Routing may need adjustment');
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All component tests completed');
console.log('='.repeat(60));
console.log('\n📝 Next Steps:');
console.log('  1. Start the development server: npm run dev');
console.log('  2. Test the API endpoint: POST http://localhost:3000/api/landing-chat');
console.log('  3. Example request body:');
console.log('     {');
console.log('       "message": "我想计算资产负债率",');
console.log('       "conversationHistory": []');
console.log('     }');
console.log('');
