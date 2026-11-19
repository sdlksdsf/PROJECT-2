import type { Preferences } from '../shared/types';

/**
 * Kimmino AI.
 *
 * Two modes, both private:
 *  • Offline (default): a local extractive summariser + intent router. No
 *    request ever leaves the machine.
 *  • Bring-your-own-model: point Kimmino at OpenAI, Ollama or any
 *    OpenAI-compatible endpoint. Kimmino never proxies your prompts.
 */
export interface AiRequest {
  prompt: string;
  pageText?: string;
  pageUrl?: string;
  pageTitle?: string;
}

const STOPWORDS = new Set(
  'a an the and or but if while of to in on for with without at by from as is are was were be been being this that these those it its it’s you your we our they their he she his her not no do does did have has had can could should would may might will just than then so such about into over under again more most other some any'.split(
    /\s+/
  )
);

export class AiService {
  constructor(private prefs: () => Preferences) {}

  async ask(request: AiRequest): Promise<{ ok: boolean; text: string }> {
    const prefs = this.prefs().productivity;
    if (!prefs.aiEnabled || prefs.aiProvider === 'off') {
      return this.localAnswer(request);
    }
    try {
      const reply = await this.remoteAnswer(request);
      return { ok: true, text: reply };
    } catch (err) {
      const fallback = await this.localAnswer(request);
      return {
        ok: false,
        text: `Couldn't reach your model (${(err as Error).message}).\n\n${fallback.text}`
      };
    }
  }

  async summarizePage(pageText: string, pageTitle?: string): Promise<{ ok: boolean; text: string }> {
    if (!pageText.trim()) return { ok: false, text: 'There is not enough readable text on this page to summarise.' };
    const prefs = this.prefs().productivity;
    if (prefs.aiEnabled && prefs.aiProvider !== 'off') {
      try {
        const reply = await this.remoteAnswer({
          prompt: `Summarise this page in 5 short bullet points. Keep it factual and neutral.\n\nTitle: ${pageTitle ?? ''}\n\n${pageText.slice(0, 12_000)}`
        });
        return { ok: true, text: reply };
      } catch {
        /* fall through to the offline summariser */
      }
    }
    return { ok: true, text: offlineSummary(pageText) };
  }

  private async remoteAnswer(request: AiRequest): Promise<string> {
    const prefs = this.prefs().productivity;
    const endpoint = prefs.aiEndpoint.replace(/\/$/, '');
    if (!endpoint) throw new Error('no endpoint configured');
    const context = request.pageText
      ? `Context from the page the user is viewing (${request.pageUrl ?? ''}):\n"""\n${request.pageText.slice(0, 8000)}\n"""\n\n`
      : '';
    const system =
      'You are Kimmino AI, a concise assistant inside the Kimmino browser. Answer in plain text, no markdown tables. Never invent facts about the page; if the context does not contain the answer, say so.';

    if (prefs.aiProvider === 'ollama') {
      const res = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: prefs.aiModel || 'llama3.1',
          stream: false,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: `${context}${request.prompt}` }
          ]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { message?: { content?: string } };
      return data.message?.content ?? '(empty reply)';
    }

    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: prefs.aiModel || 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `${context}${request.prompt}` }
        ]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? '(empty reply)';
  }

  /** Rule-based, fully offline assistant. Small, honest, fast. */
  private async localAnswer(request: AiRequest): Promise<{ ok: boolean; text: string }> {
    const prompt = request.prompt.toLowerCase().trim();
    const text = request.pageText ?? '';

    if (/^(hi|hey|hello|yo)\b/.test(prompt)) {
      return {
        ok: true,
        text: 'Hi! I run entirely on your device. I can summarise this page, explain what Kimmino blocked, or show you where a setting lives. Ask away — nothing you type leaves this computer.'
      };
    }

    if (/(summar|tl;?dr|key points|what.*(page|article).*(about))/.test(prompt)) {
      if (!text.trim()) return { ok: false, text: 'Open an article first, then ask me to summarise it.' };
      return { ok: true, text: offlineSummary(text) };
    }

    if (/(private|privacy|track|block|safe)/.test(prompt)) {
      return {
        ok: true,
        text: [
          'Everything Kimmino protects is on the shield icon in the address bar:',
          '• Ads and trackers are blocked with EasyList + uBlock Origin filter data compiled into the app.',
          '• Third-party cookies and most site permissions are refused by default.',
          '• Canvas, WebGL, audio and font fingerprints are randomised per session.',
          '• With no account signed in, nothing is ever uploaded — not even crash reports.'
        ].join('\n')
      };
    }

    if (/(setting|where.*(turn|change|find)|how do i)/.test(prompt)) {
      return {
        ok: true,
        text: 'Open Settings (Alt+, or the ⚙ at the bottom of the sidebar). The search box at the top of Settings jumps straight to any option — try "cookies", "wallpaper" or "hardware".'
      };
    }

    if (text.trim()) {
      const keywords = topKeywords(text, 6);
      return {
        ok: true,
        text: `I'm running offline, so I can't reason freely — but this page is mostly about: ${keywords.join(', ')}.\n\n${offlineSummary(text)}\n\nTip: add a model in Settings → AI to unlock full chat, or ask me to "summarise this page".`
      };
    }

    return {
      ok: true,
      text: 'I can help with the page you are on, with Kimmino settings, or with what was blocked. To unlock free-form chat, connect a model in Settings → AI (OpenAI, Ollama or any compatible endpoint).'
    };
  }
}

export function offlineSummary(text: string, maxSentences = 5): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Nothing to summarise.';
  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z"“])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 400)
    .slice(0, 220);
  if (sentences.length <= maxSentences) return sentences.join(' ') || clean.slice(0, 400);

  const freq = new Map<string, number>();
  for (const word of clean.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []) {
    if (STOPWORDS.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  const scored = sentences.map((sentence, index) => {
    const words = sentence.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
    let score = 0;
    for (const word of words) score += freq.get(word) ?? 0;
    score = score / Math.sqrt(words.length || 1);
    if (index < 2) score *= 1.25; // lead sentences carry the point
    return { sentence, score, index };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.sentence)
    .join(' ');
}

export function topKeywords(text: string, count = 6): string[] {
  const freq = new Map<string, number>();
  for (const word of text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []) {
    if (STOPWORDS.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}
