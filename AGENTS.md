# Repository Guidelines (`ai-santiago-jv`)

## UI Components and Modern Web Guidance

When building or modifying UI in `ai-santiago-jv`, follow this strict order of precedence (including when `modern-web-guidance` skills are active):

1. **Prioritize the Console Design System (`src/styles/console.css` & `src/data/ui-copy.ts`)**:
   - Preserve the Apple Cupertino Daylight & Space Black visual tokens (`--apple-*`, `--radius-bento`, `--radius-pill`), `.console-window`, `.bubble`, and `.chip-btn` primitives so `ai.santiago-jv.tech` stays visually unified with `www.santiago-jv.tech`.
   - Route dynamic ecosystem URLs (`portfolioUrl`, `mcpDocsUrl`, `allowedOrigins`) through `src/services/remote-config.ts`.

2. **Use Modern Web Guidance for platform capabilities, accessibility, and performance**:
   - **Viewport & layout stability**: Use `100dvh` (with `100vh` fallback) on full-height containers so mobile virtual keyboards and browser toolbars never cause layout jumps.
   - **Accessible chat log & forms**: Pair every form control with an explicit `<label>` (using `.sr-only` when visually compact), isolate anti-bot honeypots inside `aria-hidden="true"`, keep `#chat-stream` annotated with `role="log" aria-live="polite" aria-atomic="false"`, and toggle `aria-busy` during active requests.
   - **Keyboard focus & reduced motion**: Guarantee `>= 3:1` `:focus-visible` contrast on all interactive elements and honor `@media (prefers-reduced-motion: reduce)`.
   - **DOM XSS safety**: Escape all untrusted text before DOM insertion (`escapeHtml`) and restrict link rendering in `src/scripts/chat-client.ts` to `https://` URLs with `rel="noopener noreferrer"`.

3. **Prioritize existing security & copy conventions when guidance conflicts**:
   - Keep all LLM requests routed exclusively through `POST /api/chat` (`src/pages/api/chat.ts`) with Cloudflare origin verification and HMAC-SHA256 v2 request signing (`src/services/chat-gatekeeper.ts`).
   - Maintain zero AI em-dash (`—`) artifacts in `UI_CONFIG` and verify changes with `npm run check`, `npm test`, and `npm run build`.
