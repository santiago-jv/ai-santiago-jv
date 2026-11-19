import { createHmac, timingSafeEqual } from 'node:crypto';

export interface ExecutedToolBadge {
  toolName: string;
  argsSummary: string;
  durationMs: number;
}

export interface ChatGatewayResponse {
  ok: boolean;
  reply: string;
  executedTools: ExecutedToolBadge[];
  meta: {
    model: string;
    provider: string;
    gatewayRouted: boolean;
    cached: boolean;
    blockedInjection?: boolean;
  };
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * 60_000;
const MAX_TRACKED_IPS = 4_000;
const edgeIpBuckets = new Map<string, number[]>();

const EDGE_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|any\s+|previous\s+|prior\s+|above\s+|the\s+)*(?:instructions|rules|prompts|directions|guidelines|constraints)/i,
  /(?:disregard|forget|override|bypass)\s+(?:all\s+|any\s+|previous\s+|prior\s+|system\s+)*(?:instructions|rules|prompts|guardrails)/i,
  /(?:olvida|ignora|omite|descarta|salta)\s+(?:todas\s+|las\s+|tus\s+|cualquier\s+)*(?:instrucciones|reglas|directivas|restricciones)/i,
  /(?:reveal|show|print|repeat|dump|output|expose|leak|verbatim|copy)\s+(?:me\s+)?(?:your\s+|the\s+|all\s+|full\s+|initial\s+)*(?:system\s*prompt|instructions|hidden\s*prompt|developer\s*prompt|markdown\s*source|raw\s*markdown|secret|api\s*key)/i,
  /(?:revela|muestra|imprime|repite|dime|copia)\s+(?:tu\s+|el\s+|las\s+)*(?:system\s*prompt|prompt\s*del\s*sistema|instrucciones\s*internas|instrucciones\s*ocultas|archivo\s*markdown)/i,
  /<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/?untrusted_recruiter_input>/i,
];

export function verifyCloudflareOriginToken(
  tokenHeader: string | null,
  expectedSecret?: string,
): boolean {
  const secret = expectedSecret?.trim();
  const token = tokenHeader?.trim();
  if (!secret || !token) return false;
  const bufA = Buffer.from(token, 'utf8');
  const bufB = Buffer.from(secret, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function extractTrustedClientIp(
  request: Request,
  cfOriginVerified: boolean,
  clientAddress?: string,
): string {
  if (cfOriginVerified) {
    const cfIp = request.headers.get('cf-connecting-ip')?.trim();
    if (cfIp) return cfIp;
  }

  const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercelIp) return vercelIp;

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  if (clientAddress?.trim()) return clientAddress.trim();

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  return '127.0.0.1';
}

export function signPayloadWithHmac(timestamp: string, rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
}

export function signPayloadWithHmacV2(
  timestamp: string,
  clientIp: string,
  rawBody: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${clientIp}.${rawBody}`, 'utf8')
    .digest('hex');
}

export function isAllowedBrowserOrigin(
  originHeader: string | null,
  refererHeader: string | null,
  allowedEnv = 'https://ai.santiago-jv.tech,https://www.santiago-jv.tech',
  isProd = process.env.NODE_ENV === 'production',
): boolean {
  const allowedList = [
    ...allowedEnv.split(','),
    'https://ai.santiago-jv.tech',
    'https://www.santiago-jv.tech',
  ]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const candidate = (originHeader || refererHeader || '').trim().toLowerCase();
  if (!candidate) {
    return !isProd;
  }

  if (allowedList.some((allowed) => candidate === allowed || candidate.startsWith(`${allowed}/`))) {
    return true;
  }

  if (
    !isProd &&
    (candidate.startsWith('http://localhost:') || candidate.startsWith('http://127.0.0.1:'))
  ) {
    return true;
  }

  return false;
}

export function checkEdgeRateLimit(
  ip: string,
  minuteLimit = 8,
  hourLimit = 30,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  if (edgeIpBuckets.size >= MAX_TRACKED_IPS) {
    for (const [key, list] of edgeIpBuckets.entries()) {
      const fresh = list.filter((ts) => now - ts < HOUR_MS);
      if (fresh.length === 0) edgeIpBuckets.delete(key);
      else edgeIpBuckets.set(key, fresh);
    }
    while (edgeIpBuckets.size >= MAX_TRACKED_IPS) {
      const oldestKey = edgeIpBuckets.keys().next().value;
      if (!oldestKey) break;
      edgeIpBuckets.delete(oldestKey);
    }
  }

  const history = (edgeIpBuckets.get(ip) || []).filter((ts) => now - ts < HOUR_MS);
  const lastMinute = history.filter((ts) => now - ts < MINUTE_MS);

  if (lastMinute.length >= minuteLimit) {
    edgeIpBuckets.set(ip, history);
    const oldest = lastMinute[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + MINUTE_MS - now) / 1000)),
    };
  }

  if (history.length >= hourLimit) {
    edgeIpBuckets.set(ip, history);
    const oldest = history[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + HOUR_MS - now) / 1000)),
    };
  }

  history.push(now);
  edgeIpBuckets.set(ip, history);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getEdgeRateLimitBucketCountForTests(): number {
  return edgeIpBuckets.size;
}

export function resetEdgeRateLimitForTests(): void {
  edgeIpBuckets.clear();
}

export function detectPromptInjectionAtEdge(message: string): boolean {
  const normalized = message.normalize('NFKC').trim();
  return EDGE_INJECTION_PATTERNS.some((rx) => rx.test(normalized));
}
