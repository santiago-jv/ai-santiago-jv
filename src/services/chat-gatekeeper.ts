import { createHmac } from 'node:crypto';

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
const edgeIpBuckets = new Map<string, number[]>();

const EDGE_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|any\s+|previous\s+|prior\s+|above\s+|the\s+)*(?:instructions|rules|prompts|directions|guidelines|constraints)/i,
  /(?:disregard|forget|override|bypass)\s+(?:all\s+|any\s+|previous\s+|prior\s+|system\s+)*(?:instructions|rules|prompts|guardrails)/i,
  /(?:olvida|ignora|omite|descarta|salta)\s+(?:todas\s+|las\s+|tus\s+|cualquier\s+)*(?:instrucciones|reglas|directivas|restricciones)/i,
  /(?:reveal|show|print|repeat|dump|output|expose|leak|verbatim|copy)\s+(?:me\s+)?(?:your\s+|the\s+|all\s+|full\s+|initial\s+)*(?:system\s*prompt|instructions|hidden\s*prompt|developer\s*prompt|markdown\s*source|raw\s*markdown|secret|api\s*key)/i,
  /(?:revela|muestra|imprime|repite|dime|copia)\s+(?:tu\s+|el\s+|las\s+)*(?:system\s*prompt|prompt\s*del\s*sistema|instrucciones\s*internas|instrucciones\s*ocultas|archivo\s*markdown)/i,
  /<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/?untrusted_recruiter_input>/i,
];

export function signPayloadWithHmac(timestamp: string, rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
}

export function isAllowedBrowserOrigin(
  originHeader: string | null,
  refererHeader: string | null,
  allowedEnv = 'https://ai.santiago-jv.tech,https://www.santiago-jv.tech',
  isProd = process.env.NODE_ENV === 'production',
): boolean {
  const allowedList = allowedEnv
    .split(',')
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
  const history = (edgeIpBuckets.get(ip) || []).filter((ts) => now - ts < HOUR_MS);
  const lastMinute = history.filter((ts) => now - ts < MINUTE_MS);

  if (lastMinute.length >= minuteLimit) {
    const oldest = lastMinute[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + MINUTE_MS - now) / 1000)),
    };
  }

  if (history.length >= hourLimit) {
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

export function resetEdgeRateLimitForTests(): void {
  edgeIpBuckets.clear();
}

export function detectPromptInjectionAtEdge(message: string): boolean {
  const normalized = message.normalize('NFKC').trim();
  return EDGE_INJECTION_PATTERNS.some((rx) => rx.test(normalized));
}
