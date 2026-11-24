// 花生十三方法库：按分组提供全部 skill 资料
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './db.js';

const SKILL_DIR = path.join(ROOT, 'data', 'skills', 'huasheng13');
const MAX_CHARS = Number(process.env.SKILL_MAX_CHARS || 14000);

export const SKILL_MODULES = [
  // 模块方法
  { group: '模块方法', name: '资料分析', refs: ['references/ziliao-fenxi.md'] },
  { group: '模块方法', name: '数量关系', refs: ['references/shuliang-guanxi.md', 'references/shuliang-gongshi.md'] },
  { group: '模块方法', name: '判断推理', refs: ['references/panduan-tuili.md', 'references/panduan-guilv.md'] },
  { group: '模块方法', name: '言语理解与表达', refs: ['references/yanyu-lianjie.md', 'references/yanyu-ciyu.md'] },
  { group: '模块方法', name: '常识判断', refs: ['references/changshi-panduan.md'] },
  { group: '模块方法', name: '申论', refs: ['references/shenlun.md'] },

  // 专项
  { group: '专项', name: '资料分析·速算', refs: ['references/ziliao-susuan.md'] },
  { group: '专项', name: '资料分析·综合', refs: ['references/ziliao-zonghe.md'] },
  { group: '专项', name: '图形推理', refs: ['references/panduan-tuxing.md'] },
  { group: '专项', name: '言语·专项', refs: ['references/yanyu-zhuanxiang.md'] },
  { group: '专项', name: '申论·表达', refs: ['references/shenlun-biaoda.md'] },
  { group: '专项', name: '申论·素材', refs: ['references/shenlun-sucai.md'] },

  // 策略与工具
  { group: '策略与工具', name: '答题策略', refs: ['references/strategy.md'] },
  { group: '策略与工具', name: '备考计划', refs: ['references/beikao-jihua.md'] },
  { group: '策略与工具', name: '错题模板', refs: ['references/cuoti-muban.md'] },
  { group: '策略与工具', name: '真题示例', refs: ['references/zhenti-shili.md'] },
  { group: '策略与工具', name: '时政热点', refs: ['references/shizheng-redian.md'] },

  // 练习
  { group: '练习', name: '资料分析练习', refs: ['examples/ziliao-lianxi.md'] },
  { group: '练习', name: '数量关系练习', refs: ['examples/shuliang-lianxi.md'] },
  { group: '练习', name: '判断推理练习', refs: ['examples/panduan-lianxi.md'] },
  { group: '练习', name: '言语理解练习', refs: ['examples/yanyu-lianxi.md'] },
  { group: '练习', name: '申论练习', refs: ['examples/shenlun-lianxi.md'] },

  // 说明
  { group: '说明', name: '技能总览', refs: ['SKILL.md'] },
  { group: '说明', name: '使用说明', refs: ['README.md'] },
];

const MODULE_REFS = Object.fromEntries(SKILL_MODULES.map((m) => [m.name, m.refs]));

export function hasHuasheng13() {
  return fs.existsSync(path.join(SKILL_DIR, 'SKILL.md'));
}

export function listSkillModules() {
  return SKILL_MODULES.map((m) => ({ name: m.name, group: m.group }));
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
