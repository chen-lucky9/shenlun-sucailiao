// 校验器：检查所有硬性约束
// 用法: node scripts/validate.js
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/collector.js';

const TODAY = new Date(); // 运行当天
const curMonth = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`;
const TOPIC_KEYS = ['law_enforcement', 'rural_revitalization', 'business_environment', 'sci_tech_innovation', 'green_development', 'industrial_upgrading', 'digital_economy', 'cultural_confidence'];
const SOURCES = ['人民日报', '求是网', '共产党员网', '重要讲话'];

const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));
const errors = [];
const warns = [];

// 1. 总数
if (articles.length < 70) errors.push(`总篇数 ${articles.length} < 70`);

// 2. 按月覆盖
const months = [];
{
  let y = 2025, m = 1;
  while (y < Number(curMonth.slice(0, 4)) || (y === Number(curMonth.slice(0, 4)) && m <= Number(curMonth.slice(5, 7)))) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; y++; }
  }
}
const byMonth = {};
for (const a of articles) {
  const m = (a.publish_date || '').slice(0, 7);
  byMonth[m] = (byMonth[m] || 0) + 1;
}
for (const m of months) {
  if ((byMonth[m] || 0) < 3) errors.push(`月份 ${m} 仅 ${byMonth[m] || 0} 篇（要求≥3）`);
}
// 最新日期必须是当前月
const latest = articles.reduce((mx, a) => (a.publish_date > mx ? a.publish_date : mx), '');
if (latest.slice(0, 7) !== curMonth) errors.push(`最新日期 ${latest} 不在当前月 ${curMonth}`);

// 3. 日期不得晚于今天
const todayStr = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;
for (const a of articles) {
  if (a.publish_date > todayStr) errors.push(`《${a.title}》日期 ${a.publish_date} 晚于今天 ${todayStr}`);
}

// 4. 来源覆盖
const bySource = {};
for (const a of articles) bySource[a.source] = (bySource[a.source] || 0) + 1;
for (const s of SOURCES) {
  if ((bySource[s] || 0) < 5) errors.push(`来源「${s}」仅 ${bySource[s] || 0} 篇（要求≥5）`);
}

// 5. 分类总数
const byTopic = {};
for (const a of articles) for (const t of a.topics) byTopic[t] = (byTopic[t] || 0) + 1;
for (const t of TOPIC_KEYS) {
  if ((byTopic[t] || 0) < 5) errors.push(`分类「${t}」共 ${byTopic[t] || 0} 篇（要求≥5）`);
}

// 6. 近3个月分类密度
const last3 = [months[months.length - 3], months[months.length - 2], months[months.length - 1]];
const last3Set = new Set(last3);
const byTopicLast3 = {};
for (const a of articles) {
  if (!last3Set.has((a.publish_date || '').slice(0, 7))) continue;
  for (const t of a.topics) byTopicLast3[t] = (byTopicLast3[t] || 0) + 1;
}
for (const t of TOPIC_KEYS) {
  if ((byTopicLast3[t] || 0) < 2) errors.push(`近3个月(${last3.join(',')})分类「${t}」仅 ${byTopicLast3[t] || 0} 篇（要求≥2）`);
}

// 7. 字段完整性
for (const a of articles) {
  if (!a.source_url || !/^https?:\/\//.test(a.source_url)) errors.push(`《${a.title}》缺少有效 source_url`);
  if (!a.original_content || a.original_content.length <= 100) errors.push(`《${a.title}》原文全文≤100字`);
  if (!Array.isArray(a.topics) || a.topics.length === 0) errors.push(`《${a.title}》缺少 topics`);
  for (const t of a.topics) if (!TOPIC_KEYS.includes(t)) errors.push(`《${a.title}》含非法 topic「${t}」`);
  if (!Array.isArray(a.golden_sentences) || a.golden_sentences.length < 5) warns.push(`《${a.title}》金句仅 ${(a.golden_sentences || []).length} 条`);
  if (!Array.isArray(a.writing_angles) || a.writing_angles.length < 3) warns.push(`《${a.title}》写作角度仅 ${(a.writing_angles || []).length} 条`);
  if (!a.core_view) warns.push(`《${a.title}》缺核心观点`);
  if (!a.summary) warns.push(`《${a.title}》缺摘要`);
  if (!a.publish_date || !/^\d{4}-\d{2}-\d{2}$/.test(a.publish_date)) errors.push(`《${a.title}》日期格式异常`);
}

// 输出
console.log('================ 校验报告 ================');
console.log(`总篇数: ${articles.length}`);
console.log(`最新日期: ${latest}（当前月 ${curMonth}）`);
console.log(`按来源: ${JSON.stringify(bySource)}`);
console.log(`按分类: ${JSON.stringify(byTopic)}`);
console.log(`近3个月分类: ${JSON.stringify(byTopicLast3)}`);
console.log(`按月: ${JSON.stringify(byMonth)}`);
console.log('------------------------------------------');
if (errors.length === 0) console.log('✅ 全部硬性约束通过');
else {
  console.log(`❌ 硬性约束失败 ${errors.length} 项：`);
  for (const e of errors) console.log('  - ' + e);
}
if (warns.length) {
  console.log(`\n⚠️ 提示 ${warns.length} 项：`);
  for (const w of warns.slice(0, 30)) console.log('  - ' + w);
}
process.exit(errors.length ? 1 : 0);
