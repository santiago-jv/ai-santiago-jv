import type { APIRoute } from 'astro';
import {
  checkEdgeRateLimit,
  detectPromptInjectionAtEdge,
  extractTrustedClientIp,
  isAllowedBrowserOrigin,
  signPayloadWithHmacV2,
  verifyCloudflareOriginToken,
} from '../../services/chat-gatekeeper';

export const prerender = false;

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const isProd = import.meta.env.PROD;
  const cfOriginSecret = (
    import.meta.env.CF_ORIGIN_SECRET ||
    process.env.CF_ORIGIN_SECRET ||
    ''
  ).trim();
  const cfTokenHeader = request.headers.get('x-santiago-origin-token');
  const cfOriginVerified = verifyCloudflareOriginToken(cfTokenHeader, cfOriginSecret);

  if (isProd && cfOriginSecret && !cfOriginVerified) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'FORBIDDEN_DIRECT_ORIGIN',
        message: 'Direct origin access is forbidden. Use https://ai.santiago-jv.tech.',
      }),
      { status: 403, headers: JSON_HEADERS },
    );
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowedOrigins =
    import.meta.env.ALLOWED_BROWSER_ORIGINS ||
    process.env.ALLOWED_BROWSER_ORIGINS ||
    'https://ai.santiago-jv.tech,https://www.santiago-jv.tech';

  if (!isAllowedBrowserOrigin(origin, referer, allowedOrigins, isProd)) {
    return new Response(
      JSON.stringify({ ok: false, code: 'FORBIDDEN_ORIGIN', message: 'Forbidden origin.' }),
      { status: 403, headers: JSON_HEADERS },
    );
  }

  let resolvedClientAddress: string | undefined;
  try {
    resolvedClientAddress = clientAddress;
  } catch {
    resolvedClientAddress = undefined;
  }

  const clientIp = extractTrustedClientIp(request, cfOriginVerified, resolvedClientAddress);

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

  let body: {
    message?: string;
    history?: Array<{ role?: string; content?: string }>;
    website?: string;
  };
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid body');
    }
    body = parsed;
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

  const message = (typeof body.message === 'string' ? body.message : '').trim();
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

  const sanitizedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (Array.isArray(body.history)) {
    for (const turn of body.history.slice(-6)) {
      if (!turn || typeof turn !== 'object') continue;
      if (
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string'
      ) {
        const cleanedTurn = turn.content.trim().slice(0, 600);
        if (!cleanedTurn) continue;
        if (detectPromptInjectionAtEdge(cleanedTurn)) {
          return new Response(
            JSON.stringify({
              ok: false,
              code: 'PROMPT_INJECTION_DETECTED',
              message: 'Request blocked by the Prompt Injection security guardrail.',
            }),
            { status: 400, headers: JSON_HEADERS },
          );
        }
        sanitizedHistory.push({ role: turn.role, content: cleanedTurn });
      }
    }
  }

  const configuredHmacSecret = (
    import.meta.env.INTERNAL_HMAC_SECRET ||
    process.env.INTERNAL_HMAC_SECRET ||
    ''
  ).trim();

  if (!configuredHmacSecret && isProd) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'UPSTREAM_UNCONFIGURED',
        message: 'AI backend service is temporarily unavailable.',
      }),
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const hmacSecret = configuredHmacSecret || 'local-dev-only-hmac';
  const forwardPayload = JSON.stringify(
    sanitizedHistory.length > 0 ? { message, history: sanitizedHistory } : { message },
  );
  const timestamp = String(Date.now());
  const signature = signPayloadWithHmacV2(timestamp, clientIp, forwardPayload, hmacSecret);

  const baseUrl = import.meta.env.DEV
    ? 'http://localhost:4000'
    : (
        import.meta.env.NEST_AI_API_URL ||
        process.env.NEST_AI_API_URL ||
        'https://api.santiago-jv.tech'
      ).replace(/\/$/, '');

  try {
    const upstreamHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ai-santiago-jv-gatekeeper/1.0 (+https://ai.santiago-jv.tech)',
      Origin: isProd ? 'https://ai.santiago-jv.tech' : 'http://localhost:4321',
      'X-Client-IP': clientIp,
      'X-Santiago-Sig-Version': '2',
      'X-Santiago-Timestamp': timestamp,
      'X-Santiago-Signature': signature,
    };

    if (cfOriginSecret) {
      upstreamHeaders['X-Santiago-Origin-Token'] = cfOriginSecret;
    }

    const upstream = await fetch(`${baseUrl}/v1/agent/chat`, {
      method: 'POST',
      headers: upstreamHeaders,
      body: forwardPayload,
      signal: AbortSignal.timeout(25_000),
    });

    const data = await upstream.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'UPSTREAM_INVALID_RESPONSE',
          message: 'AI backend service returned an invalid response.',
        }),
        { status: 502, headers: JSON_HEADERS },
      );
    }

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
