// 种子导入：把 data/articles.json 写入 SQLite（按 source_url 幂等 upsert）
import fs from 'node:fs';
import path from 'node:path';
import { db, ROOT, DB_PATH } from './db.js';

const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));

const upsert = db.prepare(`
INSERT INTO materials
  (title, column_name, publish_date, source, source_url, core_view, golden_sentences, argument_structure, topics, writing_angles, summary, original_content, organized_by)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(source_url) DO UPDATE SET
  title=excluded.title, column_name=excluded.column_name, publish_date=excluded.publish_date,
  source=excluded.source, core_view=excluded.core_view, golden_sentences=excluded.golden_sentences,
  argument_structure=excluded.argument_structure, topics=excluded.topics,
  writing_angles=excluded.writing_angles, summary=excluded.summary, original_content=excluded.original_content,
  organized_by=excluded.organized_by
`);

let inserted = 0, updated = 0;
const before = db.prepare('SELECT COUNT(*) AS c FROM materials').get().c;
for (const a of articles) {
  const r = upsert.run(
    a.title,
    a.column_name || '',
    a.publish_date,
    a.source || '',
    a.source_url,
    a.core_view || '',
    JSON.stringify(a.golden_sentences || []),
    a.argument_structure || '',
    JSON.stringify(a.topics || []),
    JSON.stringify(a.writing_angles || []),
    a.summary || '',
    a.original_content || '',
    a.organized_by || 'rule'
  );
  if (r.changes > 0) inserted++;
}
const after = db.prepare('SELECT COUNT(*) AS c FROM materials').get().c;
console.log(`种子导入完成：源 ${articles.length} 篇，数据库 ${before} -> ${after} 篇（本次写入 ${inserted}）`);
console.log(`数据库位置：${DB_PATH}`);
