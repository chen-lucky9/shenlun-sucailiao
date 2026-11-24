// 读取 data/raw 下所有文章，输出紧凑索引与统计
import fs from 'node:fs';
import path from 'node:path';
import { RAW_DIR } from '../src/collector.js';

const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const rows = [];
for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(RAW_DIR, f), 'utf8'));
    rows.push({ file: f, date: j.date || '', column: j.column || '', title: j.title || '', chars: (j.content || '').length, paras: (j.paragraphs || []).length, url: j.url });
  } catch (e) {
    rows.push({ file: f, error: e.message });
  }
}
rows.sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.title.localeCompare(b.title));

const byMonth = {};
const byColumn = {};
for (const r of rows) {
  const m = (r.date || '').slice(0, 7) || '??';
  byMonth[m] = (byMonth[m] || 0) + 1;
  byColumn[r.column || '??'] = (byColumn[r.column || '??'] || 0) + 1;
}

console.log('=== 文章索引 (' + rows.length + ') ===');
for (const r of rows) {
  if (r.error) { console.log(`ERR ${r.file}: ${r.error}`); continue; }
  console.log(`${r.date}\t${r.column}\t${r.chars}字/${r.paras}段\t${r.title}\t${r.file}`);
}
console.log('\n=== 按月 ===');
for (const k of Object.keys(byMonth).sort()) console.log(`${k}\t${byMonth[k]}`);
console.log('\n=== 按栏目 ===');
for (const [k, v] of Object.entries(byColumn).sort((a, b) => b[1] - a[1])) console.log(`${k}\t${v}`);

// 同时写一份 UTF-8 索引文件，便于复用
{
  const lines = [];
  lines.push('=== 文章索引 (' + rows.length + ') ===');
  for (const r of rows) {
    if (r.error) { lines.push(`ERR ${r.file}: ${r.error}`); continue; }
    lines.push(`${r.date}\t${r.column}\t${r.chars}字/${r.paras}段\t${r.title}\t${r.file}`);
  }
  lines.push('\n=== 按月 ===');
  for (const k of Object.keys(byMonth).sort()) lines.push(`${k}\t${byMonth[k]}`);
  lines.push('\n=== 按栏目 ===');
  for (const [k, v] of Object.entries(byColumn).sort((a, b) => b[1] - a[1])) lines.push(`${k}\t${v}`);
  fs.writeFileSync(path.join(RAW_DIR, '_index.txt'), lines.join('\n'), 'utf8');
}
