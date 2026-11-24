// 打印数据库中匹配标题的原文段落
import { db } from '../src/db.js';
const q = process.argv[2] || '';
const row = db.prepare('SELECT title, original_content FROM materials WHERE title LIKE ? LIMIT 1').get(`%${q}%`);
if (!row) { console.log('not found'); process.exit(0); }
console.log('title=', row.title);
const paras = row.original_content.split(/\n+/);
paras.forEach((p, i) => console.log(`[${i}] ${p.slice(0, 80)}`));
