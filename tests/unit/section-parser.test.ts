import { parseDocumentSections, Section } from '../../src/lib/section-parser';
import { createSectionAwareChunks } from '../../src/lib/section-aware-chunker';

const SAMPLE_TEXT_WITH_TOC = `
公司 2024 年年度报告

目录
一、公司简介............................4
二、财务概要............................10
三、管理层讨论与分析....................15
四、公司治理............................20
五、环境与社会责任......................25
六、重要事项............................30
七、股份变动及股东情况..................35
八、优先股相关情况......................40
九、债券相关情况........................45
十、财务报告............................50

... 这是一个很长的文档 ...

一、公司简介
本公司成立于...

二、财务概要
本年度收入增长...

三、管理层讨论与分析
(一) 经营情况
本年度经营良好...
1. 主营业务
主营业务包括...

四、公司治理
...

五、环境与社会责任
...

六、重要事项
...

七、股份变动及股东情况
...

八、优先股相关情况
...

九、债券相关情况
...

十、财务报告
...
`;

const SAMPLE_TEXT_NO_TOC = `
2024 年度财务分析报告

一、资产状况
本公司资产总额...

二、负债状况
负债结构稳定...
（一）流动负债
流动负债主要包括...
1. 短期借款
短期借款余额...
（二）非流动负债
...
三、所有者权益
...
四、收入分析
...
五、成本费用
...
六、利润分析
...
七、现金流分析
...
八、财务比率
...
`;

async function runTests() {
    console.log('=== Unit Test: Section Parser ===');

    console.log('\n--- Test Case 1: TOC Detection ---');
    const result1 = await parseDocumentSections(SAMPLE_TEXT_WITH_TOC);
    console.log('Method:', result1.method);
    console.log('Expected: toc');
    console.log('Sections Found:', result1.sections.length);
    // Basic validation
    if (result1.method === 'toc' && result1.sections.length > 0) {
        console.log('PASS: TOC detected');
    } else {
        console.log('FAIL: TOC detection failed');
    }

    console.log('\n--- Test Case 2: Regex Detection ---');
    const result2 = await parseDocumentSections(SAMPLE_TEXT_NO_TOC);
    console.log('Method:', result2.method);
    console.log('Expected: heading');
    console.log('Sections Found:', result2.sections.length);
    if (result2.method === 'heading' && result2.sections.length > 0) {
        console.log('PASS: Heading patterns detected');
    } else {
        console.log('FAIL: Heading detection failed');
    }

    console.log('\n--- Test Case 3: Section Aware Chunking ---');
    const chunks = createSectionAwareChunks(SAMPLE_TEXT_NO_TOC, result2.sections, 50, 10);
    console.log('Total Chunks:', chunks.length);
    if (chunks.length > 0 && chunks[0].sectionTitle) {
        console.log('PASS: Chunks created with metadata');
    } else {
        console.log('FAIL: Chunking extraction failed');
    }
}

runTests().catch(console.error);
