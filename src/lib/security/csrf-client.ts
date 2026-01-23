export type CsrfResponse = {
  success?: boolean;
  token?: string;
};

export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf');
    if (!response.ok) return null;

    const data = await response.json() as CsrfResponse;
    if (!data?.success || !data.token) return null;

    return data.token;
  } catch {
    return null;
  }
}

export async function postWithCsrf(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const csrfToken = await fetchCsrfToken();

  if (!csrfToken) {
    throw new Error('CSRF token unavailable');
  }

  const headers = new Headers(init.headers);
  headers.set('x-csrf-token', csrfToken);

  return fetch(url, {
    ...init,
    method: 'POST',
    headers,
  });
}
