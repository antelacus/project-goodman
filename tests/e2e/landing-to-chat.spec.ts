import { test, expect } from '@playwright/test';

test('landing CTA navigates to chat workspace', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: '开始使用' }).click();

    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByPlaceholder('输入您的问题...')).toBeVisible();
});
