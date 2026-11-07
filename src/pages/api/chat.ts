import type { APIRoute } from 'astro';
import {
  checkEdgeRateLimit,
  detectPromptInjectionAtEdge,
  isAllowedBrowserOrigin,
  signPayloadWithHmac,
} from '../../services/chat-gatekeeper';

export const prerender = false;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowedOrigins =
    import.meta.env.ALLOWED_BROWSER_ORIGINS ||
    process.env.ALLOWED_BROWSER_ORIGINS ||
    'https://ai.santiago-jv.tech,https://www.santiago-jv.tech';

  if (!isAllowedBrowserOrigin(origin, referer, allowedOrigins, import.meta.env.PROD)) {
    return new Response(
      JSON.stringify({ ok: false, code: 'FORBIDDEN_ORIGIN', message: 'Forbidden origin.' }),
      { status: 403, headers: JSON_HEADERS },
    );
  }

  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  const rateLimit = checkEdgeRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'RATE_LIMITED',
        message: `Rate limit reached. Retry in ${rateLimit.retryAfterSeconds}s.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: { ...JSON_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: { message?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, code: 'INVALID_JSON', message: 'Invalid JSON payload.' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    return new Response(
      JSON.stringify({ ok: true, reply: '', executedTools: [], meta: { cached: false } }),
      { status: 200, headers: JSON_HEADERS },
    );
  }

  const message = (body.message || '').trim();
  if (message.length < 2 || message.length > 2200) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'INVALID_LENGTH',
        message: 'Message must be between 2 and 2,200 characters.',
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (detectPromptInjectionAtEdge(message)) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'PROMPT_INJECTION_DETECTED',
        message: 'Request blocked by the Prompt Injection security guardrail.',
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const apiBaseUrl = (
    import.meta.env.DEV
      ? 'http://localhost:4000'
      : import.meta.env.NEST_AI_API_URL ||
        process.env.NEST_AI_API_URL ||
        'https://api.santiago-jv.tech'
  ).replace(/\/$/, '');

  const hmacSecret =
    import.meta.env.INTERNAL_HMAC_SECRET ||
    process.env.INTERNAL_HMAC_SECRET ||
    'dev-hmac-secret-santiago-jv';

  const forwardPayload = JSON.stringify({ message });
  const timestamp = String(Date.now());
  const signature = signPayloadWithHmac(timestamp, forwardPayload, hmacSecret);

  try {
    const upstream = await fetch(`${apiBaseUrl}/v1/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: import.meta.env.PROD ? 'https://ai.santiago-jv.tech' : 'http://localhost:4321',
        'X-Client-IP': clientIp,
        'X-Santiago-Timestamp': timestamp,
        'X-Santiago-Signature': signature,
      },
      body: forwardPayload,
      signal: AbortSignal.timeout(15_000),
    });

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'AI backend service is temporarily unavailable.',
      }),
      { status: 503, headers: JSON_HEADERS },
    );
  }
};
