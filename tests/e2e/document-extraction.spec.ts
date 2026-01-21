import { test, expect } from '@playwright/test';

test('document upload flow adds a selected document chip', async ({ page }) => {
    await page.route('**/api/documents/upload-temp', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                documentId: 'e2e-doc-1',
                textPreview: 'E2E preview',
                structureAnalysis: {
                    quality: 'basic',
                    hasToc: false,
                    sectionCount: 1,
                    sections: [{ title: '概览', level: 1 }],
                    suggestions: ['E2E-TEST-SUGGESTION'],
                },
            }),
        });
    });

    await page.goto('/chat');

    await page.getByTitle('添加附件').click();
    await page.getByRole('button', { name: '上传文件' }).click();

    await expect(page.getByRole('heading', { name: '选择文档' })).toBeVisible();

    await page.setInputFiles('#doc-upload-input', {
        name: 'sample-upload.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Sample document content for upload.'),
    });

    await expect(page.getByText('文档结构分析报告')).toBeVisible();
    await expect(page.getByText('E2E-TEST-SUGGESTION')).toBeVisible();

    const modal = page.locator('[aria-labelledby="document-select-modal-title"]');
    await modal.getByRole('button', { name: '×' }).first().click();

    await expect(page.getByText('sample-upload.txt')).toBeVisible();
});
