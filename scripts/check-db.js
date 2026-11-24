// 检查数据库中每条素材的字段完整性
import { db } from '../src/db.js';
const rows = db.prepare('SELECT * FROM materials').all();
let bad = 0;
for (const r of rows) {
  const golden = JSON.parse(r.golden_sentences || '[]');
  const topics = JSON.parse(r.topics || '[]');
  const angles = JSON.parse(r.writing_angles || '[]');
  const problems = [];
  if (!r.title) problems.push('title');
  if (!r.publish_date) problems.push('date');
  if (!r.source_url || !/^https?:/.test(r.source_url)) problems.push('url');
  if (!r.core_view) problems.push('core');
  if (golden.length < 5) problems.push(`golden(${golden.length})`);
  if (!r.argument_structure) problems.push('structure');
  if (!topics.length) problems.push('topics');
  if (angles.length < 3) problems.push(`angles(${angles.length})`);
  if (!r.summary) problems.push('summary');
  if (!r.original_content || r.original_content.length <= 100) problems.push(`content(${r.original_content.length})`);
  if (problems.length) { bad++; console.log(`✗ #${r.id} ${r.title} -> ${problems.join(',')}`); }
}
console.log(`\n共 ${rows.length} 条，字段不完整 ${bad} 条`);
const bySource = db.prepare('SELECT source, COUNT(*) c FROM materials GROUP BY source ORDER BY c DESC').all();
const latest = db.prepare('SELECT MAX(publish_date) d, COUNT(*) c FROM materials').get();
console.log('来源分布:', JSON.stringify(bySource));
console.log('总数/最新:', latest.c, latest.d);
