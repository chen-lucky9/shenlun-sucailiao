// 针对实际数据库（应用所服务的数据）的硬性约束校验
import { db } from '../src/db.js';

const TOPIC_KEYS = ['law_enforcement', 'rural_revitalization', 'business_environment', 'sci_tech_innovation', 'green_development', 'industrial_upgrading', 'digital_economy', 'cultural_confidence'];
const SOURCES = ['人民日报', '求是网', '共产党员网', '重要讲话'];

const TODAY = new Date();
const curMonth = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`;
const todayStr = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

const rows = db.prepare('SELECT * FROM materials').all().map((r) => ({
  ...r,
  golden: JSON.parse(r.golden_sentences || '[]'),
  topicsList: JSON.parse(r.topics || '[]'),
  angles: JSON.parse(r.writing_angles || '[]'),
}));

const errors = [];
const warns = [];

if (rows.length < 70) errors.push(`总篇数 ${rows.length} < 70`);

// 月份覆盖
function monthRange() {
  const out = [];
  let y = 2025, m = 1;
  const ty = Number(curMonth.slice(0, 4)), tm = Number(curMonth.slice(5, 7));
  while (y < ty || (y === ty && m <= tm)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
const months = monthRange();
const byMonth = {};
for (const r of rows) { const m = (r.publish_date || '').slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1; }
for (const m of months) if ((byMonth[m] || 0) < 3) errors.push(`月份 ${m} 仅 ${byMonth[m] || 0} 篇`);

const latest = rows.reduce((mx, r) => (r.publish_date > mx ? r.publish_date : mx), '');
if (latest.slice(0, 7) !== curMonth) errors.push(`最新 ${latest} 不在当前月 ${curMonth}`);

for (const r of rows) {
  if (r.publish_date > todayStr) errors.push(`《${r.title}》日期 ${r.publish_date} 晚于今天`);
  if (!r.source_url || !/^https?:\/\//.test(r.source_url)) errors.push(`《${r.title}》URL 无效`);
  if (!r.original_content || r.original_content.length <= 100) errors.push(`《${r.title}》全文≤100字`);
  if (!r.topicsList.length) errors.push(`《${r.title}》无主题`);
  for (const t of r.topicsList) if (!TOPIC_KEYS.includes(t)) errors.push(`《${r.title}》非法主题 ${t}`);
  if (r.golden.length < 5) warns.push(`《${r.title}》金句 ${r.golden.length}`);
  if (r.angles.length < 3) warns.push(`《${r.title}》角度 ${r.angles.length}`);
}

const bySource = {};
for (const r of rows) bySource[r.source] = (bySource[r.source] || 0) + 1;
for (const s of SOURCES) if ((bySource[s] || 0) < 5) errors.push(`来源 ${s} 仅 ${bySource[s] || 0}`);

const byTopic = {};
for (const r of rows) for (const t of r.topicsList) byTopic[t] = (byTopic[t] || 0) + 1;
for (const t of TOPIC_KEYS) if ((byTopic[t] || 0) < 5) errors.push(`分类 ${t} 仅 ${byTopic[t] || 0}`);

const last3 = months.slice(-3);
const last3Set = new Set(last3);
const byTopicLast3 = {};
for (const r of rows) {
  if (!last3Set.has((r.publish_date || '').slice(0, 7))) continue;
  for (const t of r.topicsList) byTopicLast3[t] = (byTopicLast3[t] || 0) + 1;
}
for (const t of TOPIC_KEYS) if ((byTopicLast3[t] || 0) < 2) errors.push(`近3个月 ${t} 仅 ${byTopicLast3[t] || 0}`);

console.log('========== 数据库约束校验（应用实际数据） ==========');
console.log(`总篇数: ${rows.length} | 最新: ${latest} | 当前月: ${curMonth}`);
console.log(`来源: ${JSON.stringify(bySource)}`);
console.log(`分类: ${JSON.stringify(byTopic)}`);
console.log(`近3个月: ${JSON.stringify(byTopicLast3)}`);
console.log(`月份数: ${Object.keys(byMonth).length}`);
console.log('--------------------------------------------------');
if (!errors.length) console.log('✅ 数据库全部硬性约束通过');
else { console.log(`❌ ${errors.length} 项失败:`); errors.forEach((e) => console.log('  - ' + e)); }
if (warns.length) { console.log(`⚠️ ${warns.length} 项提示:`); warns.slice(0, 20).forEach((w) => console.log('  - ' + w)); }
process.exit(errors.length ? 1 : 0);
