// 花生十三方法库：按模块提供 references，供方法库页面 / 问答使用
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './db.js';

const SKILL_DIR = path.join(ROOT, 'data', 'skills', 'huasheng13');
const MAX_CHARS = Number(process.env.SKILL_MAX_CHARS || 14000);

export const SKILL_MODULES = [
  { name: '资料分析', refs: ['references/ziliao-fenxi.md'] },
  { name: '数量关系', refs: ['references/shuliang-guanxi.md', 'references/shuliang-gongshi.md'] },
  { name: '判断推理', refs: ['references/panduan-tuili.md', 'references/panduan-guilv.md'] },
  { name: '言语理解与表达', refs: ['references/yanyu-lianjie.md', 'references/yanyu-ciyu.md'] },
  { name: '常识判断', refs: ['references/changshi-panduan.md'] },
  { name: '申论', refs: ['references/shenlun.md'] },
];

const MODULE_REFS = Object.fromEntries(SKILL_MODULES.map((m) => [m.name, m.refs]));

export function hasHuasheng13() {
  return fs.existsSync(path.join(SKILL_DIR, 'SKILL.md'));
}

export function listSkillModules() {
  return SKILL_MODULES.map((m) => ({ name: m.name }));
}

// 完整内容（用于方法库页面浏览）
export function getSkillContent(moduleName) {
  const m = SKILL_MODULES.find((x) => x.name === moduleName);
  const refs = m ? m.refs : SKILL_MODULES[0].refs;
  return refs
    .map((ref) => {
      try {
        return fs.readFileSync(path.join(SKILL_DIR, ref), 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n\n');
}

// 截断版本（用于注入模型上下文）
export function loadHuasheng13(moduleName) {
  let text = getSkillContent(moduleName);
  if (!text) {
    try {
      text = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
    } catch {
      /* ignore */
    }
  }
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + '\n\n（方法库已按长度截断）';
  return text;
}
