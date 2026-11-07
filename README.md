# Santiago Olayo — Web AI Agent Console (`ai.santiago-jv.tech`)

Zero-config browser AI Agent Console for recruiters, CTOs, and hiring managers to query **Santiago Olayo Villamil's** production engineering history or run deterministic job-vacancy compatibility scoring without installing an external MCP client.

- **Live Console:** [https://ai.santiago-jv.tech](https://ai.santiago-jv.tech)
- **Backend (`@nestjs/ai`):** [https://api.santiago-jv.tech](https://api.santiago-jv.tech) (`https://github.com/santiago-jv/api-santiago-jv`)
- **Portfolio:** [https://www.santiago-jv.tech](https://www.santiago-jv.tech)
- **Public MCP Server:** [https://mcp.santiago-jv.tech/mcp](https://mcp.santiago-jv.tech/mcp)

---

## Architecture (Clean Feature-Layered Astro SSR + HMAC Gatekeeper)

```text
src/
├── data/
│   └── ui-copy.ts              # Bilingual (EN/ES) copywriting and recruiter/CTO prompt chips
├── services/
│   └── chat-gatekeeper.ts      # HMAC-SHA256 signer, Origin allowlist, dual-window rate limiter & edge prompt shield
└── pages/
    ├── index.astro             # Apple Cupertino interactive AI console with live @AgentFunction() badges
    └── api/
        └── chat.ts             # Server-to-server gatekeeper signing requests to api.santiago-jv.tech
```

---

## Security Model

1. **Server-Side Secret Isolation:** `INTERNAL_HMAC_SECRET` never leaves the Astro SSR server runtime. Browser clients call `POST /api/chat` on the same origin (`ai.santiago-jv.tech`).
2. **Cryptographic Request Signing:** `/api/chat` computes `X-Santiago-Signature = HMAC_SHA256(INTERNAL_HMAC_SECRET, "${timestamp}.${rawBody}")` and `X-Santiago-Timestamp` before calling `https://api.santiago-jv.tech/v1/agent/chat`.
3. **Edge Rate Limiting & Prompt Shield:** Blocks automated floods (`8 req/min`, `30 req/hour`), honeypot bots, and prompt-injection payloads at the edge before invoking the backend.

---

## Development & Verification

```bash
npm install
npm run check
npm test
npm run build
```
