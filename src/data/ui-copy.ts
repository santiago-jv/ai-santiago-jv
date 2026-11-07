export interface PromptChip {
  label: string;
  prompt: string;
}

export const UI_CONFIG = {
  heroTitle: 'Ask anything about my work.',
  heroSubtitle: 'Backend architecture, production integrations, or paste a role to evaluate fit.',
  welcomeBody:
    'Hi, I am Santiago’s AI assistant. Ask me in English or Spanish about his work at GoodRec and Bolsiyo, or paste a job description.',
  inputPlaceholder: 'Ask a question or paste a job description...',
  thinkingLabel: 'Thinking...',
  chips: [
    {
      label: 'Stripe & Nequi payments',
      prompt:
        'What production experience does Santiago have integrating Stripe, Nequi, and Refácil and preventing duplicate charges?',
    },
    {
      label: 'Hexagonal Architecture & Redis',
      prompt:
        'How does Santiago apply Hexagonal Architecture, DDD, and Redis distributed locks at GoodRec?',
    },
    {
      label: 'Datadog, CleverTap & Metabase',
      prompt:
        'How does Santiago use Datadog APM, CleverTap funnels, Metabase SQL analytics, and Retool in production?',
    },
    {
      label: 'Evaluate a job vacancy',
      prompt:
        'Evaluate how well Santiago fits a Senior Backend Engineer role (Remote, Indefinite-Term) using Node.js, NestJS, TypeScript, PostgreSQL, Redis, AWS, and Stripe.',
    },
  ] satisfies PromptChip[],
};
