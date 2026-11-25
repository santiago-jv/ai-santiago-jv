# Changelog

All notable changes to `ai-santiago-jv` (`https://ai.santiago-jv.tech`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-24

### Features

- Initialize interactive Web AI Agent Console powered by `@nestjs/ai` and Astro SSR (`b8fab10`).
- Forward multi-turn conversation history through the HMAC-SHA256 v2 edge gatekeeper (`6d6b28e`).
- Consume centralized Neon Postgres `site_config` remote configuration in SSR links and `/api/chat` origin allowlist (`cba47c9`, `559a473`).
- Adopt Chrome Modern Web Guidance standards (`100dvh`, `aria-busy` live log states, explicit accessible labels, `enterkeyhint="send"`, high-contrast `:focus-visible`, and `prefers-reduced-motion`) and add `AGENTS.md` UI precedence rules (`d2a333c`).

### Bug Fixes

- Add IME-safe `Enter` submission (`isComposing` / `keyCode === 229`) and declarative `AbortSignal.timeout()` per Modern Web Guidance (`1fb3d66`).
- Enforce Cloudflare origin token lock, HMAC-SHA256 v2 IP binding, fail-closed secrets, and UI race guards (`264f010`).
- Align payments prompt chip with Stripe (GoodRec) and Transfiya/Nequi APIs (Bolsiyo) (`7ac5b35`).
- Guard against empty assistant bubbles and align hero typography with the personal brand system (`5816af0`, `1de264b`).

### Documentation & Maintenance

- Upgrade to Astro 7 and `@astrojs/vercel` with `path-to-regexp` override and zero `npm audit` vulnerabilities (`a48ca63`).
- Update X/Twitter handle to `@santiagojvtech` and synchronize `README.md` (`87b19ab`).
