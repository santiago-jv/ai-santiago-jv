import { UI_CONFIG } from '../data/ui-copy';

const chatStream = document.getElementById('chat-stream') as HTMLElement | null;
const chatForm = document.getElementById('chat-form') as HTMLFormElement | null;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement | null;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement | null;
const pasteVacancyBtn = document.getElementById('paste-vacancy-btn') as HTMLButtonElement | null;
const honeypotInput = document.getElementById('website-honeypot') as HTMLInputElement | null;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMarkdownLite(raw: string): string {
  return escapeHtml(raw)
    .replace(
      /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function appendUserMessage(text: string): void {
  if (!chatStream) return;
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `<div class="bubble"><p>${escapeHtml(text)}</p></div>`;
  chatStream.appendChild(row);
  chatStream.scrollTop = chatStream.scrollHeight;
}

function appendThinkingRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'msg-row assistant';
  row.innerHTML = `
    <div class="tool-badges-bar">
      <span class="tool-pill">
        <span class="tool-pill-dot"></span>
        <span>${escapeHtml(UI_CONFIG.thinkingLabel)}</span>
      </span>
    </div>
  `;
  chatStream?.appendChild(row);
  if (chatStream) chatStream.scrollTop = chatStream.scrollHeight;
  return row;
}

function renderAssistantReply(
  row: HTMLElement,
  payload: { reply?: string; executedTools?: Array<{ toolName: string; durationMs?: number }> },
): void {
  const tools = Array.isArray(payload.executedTools) ? payload.executedTools : [];
  const badgesHtml = tools
    .map(
      (t) => `
      <span class="tool-pill">
        <span class="tool-pill-dot"></span>
        <span>@AgentFunction('${escapeHtml(t.toolName)}')</span>
        <span class="tool-pill-ms">${Number(t.durationMs || 2)}ms</span>
      </span>
    `,
    )
    .join('');

  row.innerHTML = `
    ${badgesHtml ? `<div class="tool-badges-bar">${badgesHtml}</div>` : ''}
    <div class="bubble">${formatMarkdownLite(payload.reply || '')}</div>
  `;
  if (chatStream) chatStream.scrollTop = chatStream.scrollHeight;
}

async function sendPrompt(promptText: string): Promise<void> {
  const trimmed = promptText.trim();
  if (!trimmed || !chatInput || !sendBtn) return;

  appendUserMessage(trimmed);
  chatInput.value = '';
  sendBtn.disabled = true;
  const thinkingRow = appendThinkingRow();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: trimmed,
        website: honeypotInput?.value || '',
      }),
    });
    const data = await response.json();
    renderAssistantReply(thinkingRow, {
      reply: data.ok ? data.reply : data.message || 'Service unavailable.',
      executedTools: data.executedTools || [],
    });
  } catch {
    renderAssistantReply(thinkingRow, {
      reply: 'Network error. Please try again or reach out at contact@santiago-jv.tech.',
      executedTools: [],
    });
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

chatForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (chatInput) void sendPrompt(chatInput.value);
});

chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void sendPrompt(chatInput.value);
  }
});

pasteVacancyBtn?.addEventListener('click', () => {
  void sendPrompt(UI_CONFIG.sampleVacancyPrompt);
});

document.querySelectorAll('.chip-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    if (prompt) void sendPrompt(prompt);
  });
});
