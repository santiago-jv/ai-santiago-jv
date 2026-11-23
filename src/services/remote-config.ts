export interface RemotePublicSiteConfig {
  version: string;
  updatedAt: string;
  source: 'neon-postgres' | 'default-fallback';
  domains: {
    primaryDomain: string;
    portfolioUrl: string;
    aiConsoleUrl: string;
    apiUrl: string;
    mcpUrl: string;
    mcpDocsUrl: string;
    allowedOrigins: string[];
  };
  social: {
    contactEmail: string;
    xHandle: string;
    xUrl: string;
    linkedinHandle: string;
    linkedinUrl: string;
    githubHandle: string;
    githubUrl: string;
    mediumHandle: string;
    mediumUrl: string;
  };
  career: {
    resumeEnUrl: string;
    resumeEsUrl: string;
    availabilityStatus: string;
    workModalitiesEn: string;
    workModalitiesEs: string;
    locationEn: string;
    locationEs: string;
  };
}

const DEFAULT_CONFIG: RemotePublicSiteConfig = {
  version: '2026-11-23',
  updatedAt: new Date(0).toISOString(),
  source: 'default-fallback',
  domains: {
    primaryDomain: 'santiago-jv.tech',
    portfolioUrl: 'https://www.santiago-jv.tech',
    aiConsoleUrl: 'https://ai.santiago-jv.tech',
    apiUrl: 'https://api.santiago-jv.tech',
    mcpUrl: 'https://mcp.santiago-jv.tech/mcp',
    mcpDocsUrl: 'https://mcp.santiago-jv.tech/docs',
    allowedOrigins: [
      'https://www.santiago-jv.tech',
      'https://santiago-jv.tech',
      'https://ai.santiago-jv.tech',
    ],
  },
  social: {
    contactEmail: 'contact@santiago-jv.tech',
    xHandle: '@santiagojvtech',
    xUrl: 'https://x.com/santiagojvtech',
    linkedinHandle: 'santiago-jv',
    linkedinUrl: 'https://www.linkedin.com/in/santiago-jv',
    githubHandle: 'santiago-jv',
    githubUrl: 'https://github.com/santiago-jv',
    mediumHandle: '@santiago-jv',
    mediumUrl: 'https://medium.com/@santiago-jv',
  },
  career: {
    resumeEnUrl: 'https://www.santiago-jv.tech/resume/Santiago_Olayo_Villamil_CV_EN.pdf',
    resumeEsUrl: 'https://www.santiago-jv.tech/resume/Santiago_Olayo_Villamil_CV_ES.pdf',
    availabilityStatus: 'open_to_opportunities',
    workModalitiesEn: 'Remote (Global / US EST / LatAm) & Hybrid/On-site in Barranquilla, Colombia',
    workModalitiesEs: 'Remoto (Global / US EST / LatAm) e Híbrido/Presencial en Barranquilla, Colombia',
    locationEn: 'Barranquilla, Colombia (UTC-5)',
    locationEs: 'Barranquilla, Colombia (UTC-5)',
  },
};

let cachedConfig: RemotePublicSiteConfig | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 60_000;

export async function fetchRemoteSiteConfig(): Promise<RemotePublicSiteConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedAtMs < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const baseUrl = (
    import.meta.env.AGENT_API_BASE_URL ||
    process.env.AGENT_API_BASE_URL ||
    'https://api.santiago-jv.tech'
  )
    .trim()
    .replace(/\/+$/, '');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch(`${baseUrl}/v1/config/public`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return cachedConfig || DEFAULT_CONFIG;
    const data = (await response.json()) as RemotePublicSiteConfig;
    if (data && data.domains?.portfolioUrl && data.social?.contactEmail) {
      cachedConfig = data;
      cachedAtMs = now;
      return data;
    }
    return cachedConfig || DEFAULT_CONFIG;
  } catch {
    return cachedConfig || DEFAULT_CONFIG;
  } finally {
    clearTimeout(timeout);
  }
}
