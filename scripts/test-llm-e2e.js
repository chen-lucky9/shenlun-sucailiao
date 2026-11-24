// 端到端测试：用 mock 的 DeepSeek 接口验证 organizeWithLLM 全链路
import fs from 'node:fs';
import path from 'node:path';
import { RAW_DIR } from '../src/collector.js';

process.env.DEEPSEEK_API_KEY = 'test-key';
process.env.DEEPSEEK_BASE_URL = 'http://127.0.0.1:9999';
process.env.DEEPSEEK_TIMEOUT_MS = '10000';

const { llmEnabled, organizeWithLLM } = await import('../src/llm-organizer.js');

const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const raw = JSON.parse(fs.readFileSync(path.join(RAW_DIR, files[0]), 'utf8'));

console.log('llmEnabled=', llmEnabled());
const a = await organizeWithLLM(raw);
console.log('organized_by=', a.organized_by);
console.log('topics=', JSON.stringify(a.topics));
console.log('golden=', a.golden_sentences.length, 'allVerbatim=', a.golden_sentences.every((g) => raw.content.includes(g)));
console.log('angles=', a.writing_angles.length);
console.log('contentUnchanged=', a.original_content === raw.content);
console.log('core_view=', a.core_view);

const ok =
  a.organized_by === 'deepseek' &&
  a.golden_sentences.length >= 5 &&
  a.golden_sentences.every((g) => raw.content.includes(g)) &&
  a.writing_angles.length >= 3 &&
  a.original_content === raw.content &&
  a.topics.every((t) => ['law_enforcement', 'rural_revitalization', 'business_environment', 'sci_tech_innovation', 'green_development', 'industrial_upgrading', 'digital_economy', 'cultural_confidence'].includes(t));

console.log(ok ? 'E2E PASS' : 'E2E FAIL');
process.exit(ok ? 0 : 1);
