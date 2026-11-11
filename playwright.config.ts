import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = 'http://127.0.0.1:' + port;

const webServerEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    LLM_API_KEY: process.env.LLM_API_KEY ?? 'placeholder-llm-key',
    LLM_BASE_URL: process.env.LLM_BASE_URL ?? 'http://127.0.0.1:9/v1',
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? 'placeholder-secret-key',
};

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'line' : 'list',
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: devices['Desktop Chrome'],
        },
    ],
    webServer: {
        command: 'npm run dev -- --hostname 127.0.0.1 --port ' + port,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: webServerEnv,
    },
});
