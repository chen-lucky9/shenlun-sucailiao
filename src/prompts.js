// 提示词加载：从 data/prompts/*.md 中提取 ```text 代码块作为系统提示词
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './db.js';

const cache = new Map();

function loadPrompt(file, key) {
  if (cache.has(key)) return cache.get(key);
  const p = path.join(ROOT, 'data', 'prompts', file);
  const raw = fs.readFileSync(p, 'utf8');
  const m = raw.match(/```text\s*([\s\S]*?)```/);
  const text = (m ? m[1] : raw).trim();
  cache.set(key, text);
  return text;
}

export function reviewPrompt() {
  return loadPrompt('review.md', 'review');
}
