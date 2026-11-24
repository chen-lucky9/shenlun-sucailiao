// 花生十三方法库：按模块选取 references，拼接成可注入复盘提示词的资料
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './db.js';

const SKILL_DIR = path.join(ROOT, 'data', 'skills', 'huasheng13');
const MAX_CHARS = Number(process.env.SKILL_MAX_CHARS || 14000);

const MODULE_REFS = {
  资料分析: ['references/ziliao-fenxi.md'],
  数量关系: ['references/shuliang-guanxi.md', 'references/shuliang-gongshi.md'],
  言语理解与表达: ['references/yanyu-lianjie.md', 'references/yanyu-ciyu.md'],
  言语理解: ['references/yanyu-lianjie.md', 'references/yanyu-ciyu.md'],
  判断推理: ['references/panduan-tuili.md', 'references/panduan-guilv.md'],
  常识判断: ['references/changshi-panduan.md'],
  申论: ['references/shenlun.md'],
};

export function hasHuasheng13() {
  return fs.existsSync(path.join(SKILL_DIR, 'SKILL.md'));
}

export function loadHuasheng13(moduleName) {
  const refs = MODULE_REFS[moduleName] || [];
  const parts = [];
  // 优先加载该模块的 reference（方法库主体）
  for (const ref of refs) {
    try {
      parts.push(fs.readFileSync(path.join(SKILL_DIR, ref), 'utf8'));
    } catch {
      /* ignore */
    }
  }
  // 未分类时退回 SKILL.md 的速查
  if (!parts.length) {
    try {
      parts.push(fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8'));
    } catch {
      /* ignore */
    }
  }
  let text = parts.join('\n\n');
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + '\n\n（方法库已按长度截断）';
  return text;
}
