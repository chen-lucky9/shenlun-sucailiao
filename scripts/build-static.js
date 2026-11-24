// 生成离线 PWA（dist/），供脚本与每日任务复用
import { buildStatic } from '../src/staticbuild.js';
const r = buildStatic();
console.log(`✓ 离线版构建完成：${r.count} 篇素材，data.js ${r.dataKb} KB`);
console.log(`  输出目录：${r.dist}`);
