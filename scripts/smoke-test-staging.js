'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const ENV_FILE = process.env.SMOKE_ENV_FILE || path.resolve(process.cwd(), '..', '.env.staging');
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.SMOKE_REQUEST_TIMEOUT_MS || '15000', 10);
const REPORT_TIMEOUT_MS = Number.parseInt(process.env.SMOKE_REPORT_TIMEOUT_MS || '180000', 10);
const REPORT_YEAR = process.env.SMOKE_REPORT_YEAR || '2024';
const REPORT_COMPARISON_YEAR = process.env.SMOKE_REPORT_COMPARISON_YEAR || '2023';

function logStep(message) {
  console.log(`[smoke] ${message}`);
}

function parseEnvFile(contents) {
  const env = {};
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  return parseEnvFile(contents);
}

const fileEnv = loadEnvFile(ENV_FILE);
const adminPassword = process.env.ADMIN_PASSWORD || fileEnv.ADMIN_PASSWORD;
const adminUsername = process.env.ADMIN_USERNAME || fileEnv.ADMIN_USERNAME || 'admin';

/**
 * What a generated report says failed. A report that completes with a failed
 * section or no summary is a failure for the smoke check, not a pass (REQ §5.2).
 */
function reportFailures(content) {
  const failures = (content.sections || [])
    .filter((section) => section.analysisStatus === 'failed')
    .map((section) => `section ${section.id}: ${section.analysis}`);
  if (content.summary && content.summary.status === 'not_generated') {
    failures.push(`summary: ${content.summary.reason}`);
  }
  return failures;
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const setCookie = response.headers.get('set-cookie');
  return setCookie ? [setCookie] : [];
}

function createCookieJar() {
  const jar = new Map();
  return {
    addFromResponse(response) {
      const cookies = getSetCookieHeaders(response);
      for (const cookie of cookies) {
        const pair = cookie.split(';')[0];
        const eqIndex = pair.indexOf('=');
        if (eqIndex === -1) {
          continue;
        }
        const name = pair.slice(0, eqIndex).trim();
        const value = pair.slice(eqIndex + 1).trim();
        if (name && value) {
          jar.set(name, value);
        }
      }
    },
    header() {
      if (!jar.size) {
        return undefined;
      }
      return Array.from(jar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    },
  };
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options, timeoutMs, jar) {
  const headers = { ...(options.headers || {}) };
  const cookieHeader = jar.header();
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const response = await fetchWithTimeout(url, { ...options, headers }, timeoutMs);
  jar.addFromResponse(response);

  const bodyText = await response.text();
  let data = null;

  if (bodyText) {
    try {
      data = JSON.parse(bodyText);
    } catch (error) {
      throw new Error(`Invalid JSON response from ${url}`);
    }
  }

  if (!response.ok) {
    const errorMessage = data && typeof data === 'object' && 'error' in data
      ? data.error
      : response.statusText;
    throw new Error(`Request failed (${response.status}) ${url}: ${errorMessage}`);
  }

  return data;
}

function parseSseEvent(rawEvent) {
  const lines = rawEvent.split(/\r?\n/);
  let eventName = 'message';
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return { eventName, data: dataLines.join('\n') };
}

async function readReportStream(response) {
  if (!response.body) {
    throw new Error('Report response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let delimiterIndex = buffer.indexOf('\n\n');
    while (delimiterIndex !== -1) {
      const rawEvent = buffer.slice(0, delimiterIndex);
      buffer = buffer.slice(delimiterIndex + 2);

      const parsed = parseSseEvent(rawEvent);
      if (parsed && parsed.eventName === 'report') {
        let payload;
        try {
          payload = JSON.parse(parsed.data);
        } catch (error) {
          throw new Error('Invalid report event payload');
        }

        if (payload.type === 'complete') {
          return payload;
        }

        if (payload.type === 'error') {
          const message = payload?.data?.message || 'Report generation failed';
          throw new Error(message);
        }
      }

      delimiterIndex = buffer.indexOf('\n\n');
    }
  }

  throw new Error('Report stream ended without completion event');
}

async function fetchReportStream(url, options, timeoutMs, jar) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { ...(options.headers || {}) };
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    jar.addFromResponse(response);

    if (!response.ok) {
      const bodyText = await response.text();
      let details = response.statusText;
      if (bodyText) {
        try {
          const data = JSON.parse(bodyText);
          if (data && typeof data === 'object' && 'error' in data) {
            details = data.error;
          }
        } catch (error) {
          // Ignore JSON parsing errors for failure responses.
        }
      }
      throw new Error(`Report request failed (${response.status}) ${url}: ${details}`);
    }

    return await readReportStream(response);
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(`Report generation timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function run() {
  const jar = createCookieJar();

  logStep(`Using base URL ${BASE_URL}`);
  if (fs.existsSync(ENV_FILE)) {
    logStep(`Loaded env file ${ENV_FILE}`);
  } else {
    logStep(`Env file ${ENV_FILE} not found, using process environment only`);
  }

  logStep('Health check');
  const health = await fetchJson(`${BASE_URL}/api/health`, { method: 'GET' }, REQUEST_TIMEOUT_MS, jar);
  if (!health || !health.status) {
    throw new Error('Health check returned unexpected payload');
  }

  logStep('Admin login');
  const login = await fetchJson(
    `${BASE_URL}/api/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUsername, password: adminPassword }),
    },
    REQUEST_TIMEOUT_MS,
    jar
  );

  if (!login || login.success !== true) {
    throw new Error('Admin login failed');
  }

  logStep('Sessions API');
  const sessions = await fetchJson(
    `${BASE_URL}/api/sessions`,
    { method: 'GET' },
    REQUEST_TIMEOUT_MS,
    jar
  );

  if (!sessions || !Array.isArray(sessions.sessions)) {
    throw new Error('Sessions API returned unexpected payload');
  }

  logStep('Report generation');
  const reportEvent = await fetchReportStream(
    `${BASE_URL}/api/reports/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        year: REPORT_YEAR,
        comparisonYear: REPORT_COMPARISON_YEAR,
      }),
    },
    REPORT_TIMEOUT_MS,
    jar
  );

  const failures = reportFailures(reportEvent.data.content);
  if (failures.length > 0) {
    throw new Error(`Report generated with failures: ${failures.join('; ')}`);
  }

  logStep('Smoke test completed successfully');
}

module.exports = { reportFailures };

if (require.main === module) {
  if (!adminPassword) {
    console.error('[smoke] Missing ADMIN_PASSWORD. Configure it in SMOKE_ENV_FILE or environment variables.');
    process.exit(1);
  }
  run().catch((error) => {
    console.error(`[smoke] Failed: ${error.message || error}`);
    process.exit(1);
  });
}
