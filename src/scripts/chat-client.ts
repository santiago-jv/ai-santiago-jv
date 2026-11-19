import { UI_CONFIG } from '../data/ui-copy';

const chatStream = document.getElementById('chat-stream') as HTMLElement | null;
const chatForm = document.getElementById('chat-form') as HTMLFormElement | null;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement | null;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement | null;
const honeypotInput = document.getElementById('website-honeypot') as HTMLInputElement | null;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMarkdownLite(raw: string): string {
  const linkPlaceholders: string[] = [];
  const escaped = escapeHtml(raw).replace(
    /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
    (_, label: string, href: string) => {
      const idx = linkPlaceholders.length;
      linkPlaceholders.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`);
      return `__LINK_TOKEN_${idx}__`;
    },
  );

  const formatted = escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/__LINK_TOKEN_(\d+)__/g, (_, i: string) => linkPlaceholders[Number(i)] || '');

  return formatted
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
        <span>${escapeHtml(t.toolName)}</span>
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

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_HISTORY_TURNS = 6;
const conversationHistory: ConversationTurn[] = [];
const chipButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.chip-btn'));
let isSending = false;

function setComposerDisabled(disabled: boolean): void {
  if (sendBtn) sendBtn.disabled = disabled;
  chipButtons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

async function sendPrompt(promptText: string): Promise<void> {
  const trimmed = promptText.trim();
  if (isSending || !trimmed || !chatInput || !sendBtn) return;

  isSending = true;
  const historySnapshot = conversationHistory.slice(-MAX_HISTORY_TURNS);
  appendUserMessage(trimmed);
  chatInput.value = '';
  setComposerDisabled(true);
  const thinkingRow = appendThinkingRow();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: trimmed,
        history: historySnapshot,
        website: honeypotInput?.value || '',
      }),
    });
    const data = await response.json();
    const replyText =
      data.ok && typeof data.reply === 'string' && data.reply.trim()
        ? data.reply.trim()
        : data.message || 'Temporary timeout. Please try again in a few seconds.';
    renderAssistantReply(thinkingRow, {
      reply: replyText,
      executedTools: data.executedTools || [],
    });

    if (data.ok && typeof data.reply === 'string' && data.reply.trim()) {
      conversationHistory.push(
        { role: 'user', content: trimmed },
        { role: 'assistant', content: data.reply.trim() },
      );
      if (conversationHistory.length > MAX_HISTORY_TURNS) {
        conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY_TURNS);
      }
    }
  } catch {
    renderAssistantReply(thinkingRow, {
      reply: 'Network error. Please try again or reach out at contact@santiago-jv.tech.',
      executedTools: [],
    });
  } finally {
    isSending = false;
    setComposerDisabled(false);
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

chipButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    if (prompt) void sendPrompt(prompt);
  });
});
