/**
 * The assistant's only server.
 *
 * The browser posts { model, system, messages } here; this function adds the
 * provider key and forwards the request. The key never leaves the server, so a
 * downloaded installer cannot leak it — which is the whole reason this endpoint
 * exists instead of a "paste your API key" box in Settings.
 *
 * Environment variables (set them in the Vercel project, never in the repo):
 *   GEMINI_API_KEY   — Google AI Studio key, used by the gemini-* models
 *   GROQ_API_KEY     — Groq key, used by the llama-* models
 *   AI_ALLOWED_ORIGIN (optional) — defaults to "*"; the desktop app sends no
 *                     Origin header at all, so this only matters for web use.
 */

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type Res = {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  end(): void;
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const GEMINI_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro']);
const GROQ_MODELS = new Set(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']);
const DEFAULT_MODEL = 'gemini-2.5-flash';

/** Small, dependency-free limiter: 30 questions an hour per client. */
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 30;

function limited(client: string): boolean {
  const now = Date.now();
  const record = hits.get(client);
  if (!record || record.resetAt < now) {
    hits.set(client, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > LIMIT;
}

function clamp(text: unknown, max: number): string {
  return typeof text === 'string' ? text.slice(0, max) : '';
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('cache-control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  /**
   * GET /api/ai?health=1 — says whether the keys are in place, without ever
   * revealing them. This is how the desktop app (and anyone debugging a deploy)
   * can tell "not configured" apart from "broken".
   */
  if (req.method === 'GET') {
    const wantsHealth = req.query?.health !== undefined || (req.url ?? '').includes('health');
    if (!wantsHealth) {
      res.status(405).json({ error: 'Use POST, or GET ?health=1 to check configuration.' });
      return;
    }
    const gemini = Boolean(process.env.GEMINI_API_KEY);
    const groq = Boolean(process.env.GROQ_API_KEY);
    res.status(200).json({
      ok: gemini || groq,
      gemini,
      groq,
      defaultModel: gemini ? DEFAULT_MODEL : groq ? 'llama-3.3-70b-versatile' : null,
      models: { gemini: Array.from(GEMINI_MODELS), groq: Array.from(GROQ_MODELS) },
      note: gemini || groq ? 'Ready.' : 'No provider key is set on this deployment.'
    });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const forwarded = req.headers['x-forwarded-for'];
  const client = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || 'unknown';
  if (limited(client)) {
    res.status(429).json({ error: 'Too many questions in the last hour. Try again later.' });
    return;
  }

  let payload: { model?: unknown; system?: unknown; messages?: unknown };
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof payload) ?? {};
  } catch {
    res.status(400).json({ error: 'Body must be JSON.' });
    return;
  }

  const model = typeof payload.model === 'string' && (GEMINI_MODELS.has(payload.model) || GROQ_MODELS.has(payload.model))
    ? payload.model
    : DEFAULT_MODEL;

  const messages: ChatMessage[] = Array.isArray(payload.messages)
    ? (payload.messages as ChatMessage[])
        .filter((message) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
        .slice(-20)
        .map((message) => ({ role: message.role, content: clamp(message.content, 12000) }))
    : [];

  if (!messages.length) {
    res.status(400).json({ error: 'Ask a question first.' });
    return;
  }
  const system = clamp(payload.system, 8000);

  try {
    const text = GEMINI_MODELS.has(model)
      ? await askGemini(model, system, messages)
      : await askGroq(model, system, messages);
    res.status(200).json({ text, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upstream failure';
    // A missing key is a deployment problem, not a user problem — say so plainly.
    const status = /not configured/i.test(message) ? 503 : 502;
    res.status(status).json({ error: message });
  }
}

async function askGemini(model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('The assistant is not configured yet (GEMINI_API_KEY).');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }]
        })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
      })
    }
  );
  const data = (await response.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(data.error?.message || `Gemini returned ${response.status}`);
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty answer.');
  return text;
}

async function askGroq(model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('The assistant is not configured yet (GROQ_API_KEY).');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 1024,
      messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages]
    })
  });
  const data = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(data.error?.message || `Groq returned ${response.status}`);
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('The model returned an empty answer.');
  return text;
}
