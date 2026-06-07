// Auth utilities used by middleware (Edge runtime) and the auth API route.
// The cookie value stored in the browser is the SHA-256 of the access code,
// so the literal PIN never leaves the server.

export const AUTH_COOKIE = 'pt_auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function getExpectedToken(accessCode: string): Promise<string> {
  return sha256Hex(`pt:${accessCode}`);
}
