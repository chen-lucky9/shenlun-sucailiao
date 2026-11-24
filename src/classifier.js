// 行测题型分类器：根据题目文字输出 模块 / 题型 / 标签
import { chatWithModel } from './ai-chat.js';

const MODULES = ['言语理解与表达', '判断推理', '数量关系', '资料分析', '常识判断'];

const SYSTEM = `你是行测题型分类器。根据用户给出的题目文字，判断它属于哪个模块、具体题型，并给出标签。
模块只能是：${MODULES.join('、')}。
只输出一个 JSON 对象，不要 markdown：
{"module":"...","type":"...","tags":["..."],"reason":"一句话依据"}`;

export async function classifyQuestion(question) {
  const r = await chatWithModel({
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: String(question || '').slice(0, 4000) },
    ],
    temperature: 0.1,
    maxTokens: 600,
  });
  let text = r.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let j = {};
  try {
    j = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return {
    module: MODULES.includes(j.module) ? j.module : '未分类',
    type: typeof j.type === 'string' ? j.type.slice(0, 40) : '',
    tags: Array.isArray(j.tags) ? j.tags.filter((t) => typeof t === 'string').slice(0, 8) : [],
    reason: typeof j.reason === 'string' ? j.reason.slice(0, 120) : '',
  };
}
