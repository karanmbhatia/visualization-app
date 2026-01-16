import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Properly formatted CSP header for WASM + eval
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "script-src-elem 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' blob:",
    "worker-src 'self' blob:",
    "wasm-unsafe-eval",  // ← CRITICAL for WASM
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join('; ');  // ← Proper semicolon separation

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
};
