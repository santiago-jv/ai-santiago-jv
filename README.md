# Santiago Olayo — Web AI Agent Console (`ai.santiago-jv.tech`)

Zero-config browser AI Agent Console for recruiters, CTOs, and hiring managers to query **Santiago Olayo Villamil's** production engineering history or run deterministic job-vacancy compatibility scoring without installing an external MCP client.

- **Live Console:** [https://ai.santiago-jv.tech](https://ai.santiago-jv.tech)
- **Backend (`@nestjs/ai`):** [https://api.santiago-jv.tech](https://api.santiago-jv.tech) (`https://github.com/santiago-jv/api-santiago-jv`)
- **Portfolio:** [https://www.santiago-jv.tech](https://www.santiago-jv.tech)
- **Public MCP Server:** [https://mcp.santiago-jv.tech/mcp](https://mcp.santiago-jv.tech/mcp)
- **X (Twitter):** [@santiagojvtech](https://x.com/santiagojvtech)
- **LinkedIn:** [linkedin.com/in/santiago-jv](https://www.linkedin.com/in/santiago-jv)

---

## Architecture (Clean Feature-Layered Astro 7 SSR + HMAC v2 Gatekeeper)

```text
src/
├── data/
│   └── ui-copy.ts              # Copywriting and recruiter/CTO prompt chips
├── scripts/
│   └── chat-client.ts          # Browser chat controller with concurrency lock & XSS-safe markdown renderer
├── services/
│   └── chat-gatekeeper.ts      # Cloudflare Origin Lock verifier, HMAC-SHA256 v2 signer, Origin allowlist, dual-window rate limiter & edge prompt shield
└── pages/
    ├── index.astro             # Apple Cupertino interactive AI console with live @AgentFunction() badges
    └── api/
        └── chat.ts             # Server-to-server gatekeeper signing requests to api.santiago-jv.tech
```

---

## Security Model

1. **Cloudflare Proxy & Origin Lock:** Requests are proxied through Cloudflare (`Full (strict)` TLS + WAF + Rate Limiting) and verified at the Astro SSR origin via `X-Santiago-Origin-Token` (`CF_ORIGIN_SECRET`), blocking direct `*.vercel.app` bypasses.
2. **Server-Side Secret Isolation:** `INTERNAL_HMAC_SECRET` never leaves the Astro SSR server runtime (fails closed in production if unset). Browser clients call `POST /api/chat` on the same origin (`ai.santiago-jv.tech`).
3. **Cryptographic Request Signing (HMAC-SHA256 v2):** `/api/chat` computes `X-Santiago-Signature = HMAC_SHA256(INTERNAL_HMAC_SECRET, "${timestamp}.${clientIp}.${rawBody}")` along with `X-Santiago-Timestamp`, `X-Santiago-Sig-Version: 2`, and `X-Client-IP` before calling `https://api.santiago-jv.tech/v1/agent/chat`.
4. **Edge Rate Limiting & Prompt Shield:** Blocks automated floods (`8 req/min`, `30 req/hour`, capped at `4,000` tracked IPs), honeypot bots, and prompt-injection payloads (EN/ES) at the edge before invoking the backend.

---

## Development & Verification

```bash
npm install
npm run check
npm test
npm run build
```
