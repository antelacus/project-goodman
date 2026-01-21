import { test, expect } from '@playwright/test';

test('report generation flow renders a completed report', async ({ page }) => {
    const now = new Date().toISOString();
    const reportContent = {
        title: '2024年度财务综合分析报告',
        generatedAt: now,
        year: '2024',
        comparisonYear: '2023',
        summary: {
            keyFindings: ['现金流稳定', '盈利能力改善', '短期偿债能力良好'],
            riskWarnings: ['应收账款回收周期偏长'],
            recommendations: ['优化存货周转', '加强费用控制', '提升现金周转效率'],
        },
        sections: [
            { id: 'liquidity', title: '流动性分析', metrics: [], analysis: '流动性保持稳定。', sourceDocuments: [] },
            { id: 'solvency', title: '偿债能力分析', metrics: [], analysis: '偿债能力表现良好。', sourceDocuments: [] },
            { id: 'profitability', title: '盈利能力分析', metrics: [], analysis: '盈利能力持续提升。', sourceDocuments: [] },
            { id: 'efficiency', title: '运营效率分析', metrics: [], analysis: '运营效率有改善空间。', sourceDocuments: [] },
            { id: 'comprehensive', title: '综合评价与建议', metrics: [], analysis: '整体表现稳健。', sourceDocuments: [] },
        ],
    };
    const sseBody = [
        `data: ${JSON.stringify({ type: 'phase', data: { phase: 'check', status: 'started' } })}\n\n`,
        `data: ${JSON.stringify({ type: 'phase', data: { phase: 'check', status: 'completed' } })}\n\n`,
        `data: ${JSON.stringify({ type: 'complete', data: { reportId: 'report-1', content: reportContent, generationTimeMs: 1234 } })}\n\n`,
    ].join('');

    await page.route('**/api/financial-data/years', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { years: ['2024', '2023'] } }),
        });
    });
    await page.route('**/api/reports/parse-config', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    intent: 'confirm',
                    year: '2024',
                    comparisonYear: '2023',
                    clarificationNeeded: null,
                },
            }),
        });
    });
    await page.route('**/api/reports/generate', async (route) => {
        await route.fulfill({
            status: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: sseBody,
        });
    });

    await page.goto('/chat');

    await page.getByRole('button', { name: '工具' }).click();
    await page.getByRole('button', { name: '生成报告' }).click();

    await expect(page.getByText('财务分析报告生成工具')).toBeVisible();

    await page.getByPlaceholder('输入您的问题...').fill('确认');
    await page.getByPlaceholder('输入您的问题...').press('Enter');

    await expect(page.getByText('执行摘要')).toBeVisible();
});
