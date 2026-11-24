// 抽样检查整理质量
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/collector.js';
const arts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));

const minGolden = Math.min(...arts.map((a) => a.golden_sentences.length));
const minAngles = Math.min(...arts.map((a) => a.writing_angles.length));
const emptyCore = arts.filter((a) => !a.core_view).length;
const emptySummary = arts.filter((a) => !a.summary).length;
const minContent = Math.min(...arts.map((a) => a.original_content.length));
console.log(`样本 ${arts.length} 篇：金句最少 ${minGolden} 条，写作角度最少 ${minAngles} 条，空核心观点 ${emptyCore}，空摘要 ${emptySummary}，最短原文 ${minContent} 字`);

function show(a) {
  console.log('\n==============================');
  console.log(`《${a.title}》`);
  console.log(`栏目:${a.column_name} | 日期:${a.publish_date} | 来源:${a.source}`);
  console.log(`主题:${a.topics.join(',')}`);
  console.log(`核心观点:${a.core_view}`);
  console.log(`金句(${a.golden_sentences.length}):`);
  a.golden_sentences.forEach((g, i) => console.log(`  ${i + 1}. ${g}`));
  console.log(`结构:${a.argument_structure}`);
  console.log(`角度:${a.writing_angles.join(' / ')}`);
  console.log(`摘要:${a.summary}`);
  console.log(`原文:${a.original_content.length} 字`);
}

// 各来源抽一篇
for (const src of ['求是网', '共产党员网', '重要讲话', '人民日报']) {
  const a = arts.find((x) => x.source === src);
  if (a) show(a);
}
