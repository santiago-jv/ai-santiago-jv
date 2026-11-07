export interface PromptChip {
  badge: string;
  label: string;
  prompt: string;
}

export const UI_CONFIG = {
  statusBadge: '@nestjs/ai · Auto-Language LLM · Cloudflare AI Gateway',
  heroEyebrow: 'LIVE @NESTJS/AI AGENT CONSOLE',
  heroTitle: 'Ask anything about Santiago or paste a job vacancy.',
  heroSubtitle:
    'Write in English, Spanish, or any language. The @nestjs/ai agent automatically detects your language and queries the knowledge base in real time.',
  welcomeGreeting: 'Hi! I am Santiago Olayo’s @nestjs/ai Agent.',
  welcomeBody:
    'Ask me in any language about his work at GoodRec and Bolsiyo (Hexagonal Architecture, Redis locks, Stripe/Nequi, Datadog, CleverTap, MCP) or paste a Job Description for a fit evaluation.',
  inputPlaceholder: 'Write in English or Español, or paste a Job Description...',
  thinkingLabel: 'Running @AgentFunction() tools on api.santiago-jv.tech...',
  securityFooter:
    'Protected by HMAC-SHA256 Origin Gatekeeper, Dual-Window Rate Limiting (8/min), and XML Prompt-Injection Sandboxing.',
  sampleVacancyPrompt:
    'Evaluate how well Santiago fits this role: Senior Backend Engineer (Remote, Indefinite-Term). Stack: Node.js, NestJS, TypeScript, Hexagonal Architecture, PostgreSQL, Redis locks, AWS ECS, Stripe/Nequi payments, and Datadog APM.',
  chips: [
    {
      badge: 'Payments & Wallets',
      label: 'Stripe, Nequi & preventing duplicate charges',
      prompt:
        'What real production experience does Santiago have integrating Stripe, Nequi, and Refácil and preventing duplicate payments?',
    },
    {
      badge: 'Arquitectura (ES)',
      label: '¿Cómo aplica Arquitectura Hexagonal y Redis Locks?',
      prompt:
        '¿Cómo aplica Santiago la Arquitectura Hexagonal, DDD y los locks distribuidos en Redis en producción dentro de GoodRec?',
    },
    {
      badge: 'Observability & Data',
      label: 'Datadog APM, CleverTap & Metabase in production',
      prompt:
        'How does Santiago use Datadog APM, CleverTap product funnels, Metabase SQL analytics, and Retool in production?',
    },
    {
      badge: 'Contratación y CV (ES)',
      label: 'Disponibilidad, modalidad de contrato y CV en PDF',
      prompt:
        '¿Cuál es la disponibilidad de Santiago, qué modalidad de contrato prioriza, cómo maneja su expectativa salarial y dónde descargo su CV?',
    },
  ] satisfies PromptChip[],
};
