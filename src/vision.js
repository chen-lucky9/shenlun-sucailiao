// 图片识别（多模态）模块：OpenAI 兼容 /chat/completions
const API_KEY = process.env.VISION_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const BASE_URL = (process.env.VISION_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = process.env.VISION_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const MAX_TOKENS = Number(process.env.VISION_MAX_TOKENS || 6000);

export function visionEnabled() {
  return !!API_KEY;
}

export function visionModel() {
  return MODEL;
}

export async function analyzeImage({ base64, mime = 'image/jpeg', prompt }) {
  if (!API_KEY) throw new Error('未配置 VISION_API_KEY / DEEPSEEK_API_KEY');
  if (!/^[\x21-\x7E]+$/.test(API_KEY)) {
    throw new Error('VISION_API_KEY / DEEPSEEK_API_KEY 含非 ASCII 字符（可能填成了占位符），请换成真实 Key');
  }
  const url = `${BASE_URL}/chat/completions`;
  const body = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt || '请识别图片中的行测题目，原样输出题干和选项，不要作答。' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: MAX_TOKENS,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Vision HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    text: choice?.message?.content || '',
    model: data.model || MODEL,
    finishReason: choice?.finish_reason || '',
  };
}
