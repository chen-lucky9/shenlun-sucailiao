// 验证花生十三方法库按模块加载
import { loadHuasheng13, hasHuasheng13 } from '../src/skill-library.js';

console.log('exists=', hasHuasheng13());
for (const m of ['资料分析', '数量关系', '判断推理', '言语理解与表达', '']) {
  const t = loadHuasheng13(m);
  console.log((m || '(none)').padEnd(8), 'len=', t.length, 'head=', t.slice(0, 50).replace(/\n/g, ' '));
}
