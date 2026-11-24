// DeepSeek（OpenAI 兼容接口）整理器：按 11 维度要求整理单篇原文
// 有 DEEPSEEK_API_KEY 时启用；失败自动回退到规则整理（由调用方处理）
import {
  TOPIC_KEYS, TOPIC_LABELS,
  normalizeTitleColumn, extractGolden, makeAngles, makeStructure, firstThesis, makeSummary, resolveTopics,
} from './organizer.js';

const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || '';
const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 120000);

export function llmEnabled() {
  return !!API_KEY;
}

const TOPIC_SPEC = TOPIC_KEYS.map((k) => `- ${k}：${TOPIC_LABELS[k]}`).join('\n');

const SYSTEM_PROMPT = `你是公务员考试申论备考的素材整理专家。用户会给你一篇权威媒体的评论文章或领导人讲话全文，你要严格依据原文整理申论素材。

【防幻觉硬约束】
- 只能使用用户提供的原文内容；禁止补充原文之外的新闻、数据、人物、事件、引语。
- golden_sentences 必须是原文中的原句，逐字摘录，不得改写、拼接或缩写；系统会校验是否为原文子串。
- 不要输出 title / column / date / source / original_content，这些由系统提供。

【你负责的 6 项】
1. core_view：核心观点概括，1-2 句话，基于原文。
2. golden_sentences：好词好句/金句摘录，至少 5 条，每条 15-80 字，逐字摘自原文。
3. argument_structure：论证结构/框架，说明行文逻辑（如“提出观点—分层论证—对策升华”）。
4. topics：从下列 8 个英文 key 中选 1-2 个最贴切的，必须用英文 key，禁止中文：
${TOPIC_SPEC}
5. writing_angles：可用于申论的写作角度，至少 3 个，每个一句话。
6. summary：原文摘要（正文要点），100-200 字。

【输出格式】
只输出一个 JSON 对象，不要 markdown 代码块：
{
  "core_view": "...",
  "golden_sentences": ["...", "...", "...", "...", "..."],
  "argument_structure": "...",
  "topics": ["law_enforcement"],
  "writing_angles": ["...", "...", "..."],
  "summary": "..."
}`;

export async function organizeWithLLM(raw) {
  if (!API_KEY) throw new Error('未配置 DEEPSEEK_API_KEY / LLM_API_KEY');
  const norm = normalizeTitleColumn(raw.title, raw.column);
  const userPrompt = `标题：${norm.title}
栏目：${norm.column}
发布日期：${raw.date}
来源：${raw.source || ''}

原文全文：
${raw.content}

请严格按照系统要求，输出整理后的 JSON。`;

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content || '';
  text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('DeepSeek 返回的 JSON 无法解析');
  }
  return normalizeLLMResult(parsed, raw);
}

// 校验并规范化 LLM 输出；不足的字段用原文规则补齐（保证 11 维度完整、不编造）
export function normalizeLLMResult(parsed, raw) {
  const content = (raw.content || '').trim();
  const norm = normalizeTitleColumn(raw.title, raw.column);

  let topics = Array.isArray(parsed.topics) ? parsed.topics.filter((t) => TOPIC_KEYS.includes(t)) : [];
  if (!topics.length) topics = resolveTopics(norm.title, norm.column, content);
  topics = [...new Set(topics)].slice(0, 2);

  const rawGolden = Array.isArray(parsed.golden_sentences) ? parsed.golden_sentences : [];
  const verbatim = [];
  for (const g of rawGolden) {
    if (typeof g !== 'string') continue;
    const s = g.trim();
    if (s.length >= 10 && s.length <= 90 && content.includes(s) && !verbatim.includes(s)) verbatim.push(s);
  }
  let golden = verbatim;
  if (golden.length < 5) {
    const extra = extractGolden(content, 6).filter((s) => !golden.includes(s));
    golden = [...golden, ...extra].slice(0, 6);
  }

  let angles = Array.isArray(parsed.writing_angles)
    ? parsed.writing_angles.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim())
    : [];
  if (angles.length < 3) angles = [...angles, ...makeAngles(topics)].slice(0, 4);
  angles = [...new Set(angles)].slice(0, 4);

  const core = (typeof parsed.core_view === 'string' && parsed.core_view.trim()) || firstThesis(content) || content.slice(0, 120);
  const structure = (typeof parsed.argument_structure === 'string' && parsed.argument_structure.trim()) || makeStructure(content);
  const summary = (typeof parsed.summary === 'string' && parsed.summary.trim()) || makeSummary(content);

  return {
    title: norm.title,
    column_name: norm.column,
    publish_date: raw.date,
    source: raw.source || norm.column,
    source_url: raw.url,
    core_view: core.slice(0, 200),
    golden_sentences: golden.slice(0, 6),
    argument_structure: structure.slice(0, 300),
    topics,
    writing_angles: angles,
    summary: summary.slice(0, 260),
    original_content: content,
    organized_by: 'deepseek',
  };
}
