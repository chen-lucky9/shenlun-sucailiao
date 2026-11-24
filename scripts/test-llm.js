// 校验 DeepSeek 整理管线的规范化逻辑（不调用真实 API）
import fs from 'node:fs';
import path from 'node:path';
import { RAW_DIR } from '../src/collector.js';
import { db } from '../src/db.js';
import { llmEnabled, normalizeLLMResult } from '../src/llm-organizer.js';
import { organizeRawArticle, TOPIC_KEYS } from '../src/organizer.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('✓ ' + name); }
  else { fail++; console.log('✗ ' + name + ' ' + extra); }
};

const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const raw = JSON.parse(fs.readFileSync(path.join(RAW_DIR, files[0]), 'utf8'));

ok('未配置 Key 时 llmEnabled=false', llmEnabled() === false);
const rule = organizeRawArticle(raw);
ok('规则整理 organized_by=rule', rule.organized_by === 'rule');

const paras = raw.paragraphs || raw.content.split('\n');
const verbatim = paras.filter((p) => p.length > 30).slice(0, 3).map((p) => p.slice(0, 40));
const parsed = {
  core_view: '测试核心观点',
  golden_sentences: [...verbatim, '这是一条编造的金句，绝不在原文中出现'],
  argument_structure: '测试结构',
  topics: ['law_enforcement', 'not_a_topic', '乡村振兴'],
  writing_angles: ['测试角度一'],
  summary: '测试摘要',
};

const a = normalizeLLMResult(parsed, raw);
ok('LLM 结果 organized_by=deepseek', a.organized_by === 'deepseek');
ok('topics 仅保留合法英文 key', a.topics.length > 0 && a.topics.every((t) => TOPIC_KEYS.includes(t)), JSON.stringify(a.topics));
ok('金句 ≥5 条', a.golden_sentences.length >= 5, String(a.golden_sentences.length));
ok('金句全部为原文子串', a.golden_sentences.every((g) => raw.content.includes(g)));
ok('写作角度 ≥3 个', a.writing_angles.length >= 3, String(a.writing_angles.length));
ok('原文全文未被改写', a.original_content === raw.content);

const cols = db.prepare('PRAGMA table_info(materials)').all().map((c) => c.name);
ok('数据库已含 organized_by 列', cols.includes('organized_by'));

console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);
