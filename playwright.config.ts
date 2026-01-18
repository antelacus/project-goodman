import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = 'http://127.0.0.1:' + port;

const webServerEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? 'sk-placeholder-for-e2e',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key',
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
