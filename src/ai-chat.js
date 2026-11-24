// 通用文本对话（OpenAI 兼容），供复盘 / 知识卡片等工作流复用
const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || '';
const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';

export function chatEnabled() {
  return !!API_KEY;
}

export function chatModel() {
  return MODEL;
}

export async function chatWithModel({ messages, temperature = 0.6, maxTokens = 4000 }) {
  if (!API_KEY) throw new Error('未配置 DEEPSEEK_API_KEY');
  if (!/^[\x21-\x7E]+$/.test(API_KEY)) {
    throw new Error('DEEPSEEK_API_KEY 含非 ASCII 字符（可能填成了占位符 sk-你的key），请换成真实 Key');
  }
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content || '', model: data.model || MODEL };
}
