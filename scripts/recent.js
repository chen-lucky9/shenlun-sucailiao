// 打印某日入库素材
import { db } from '../src/db.js';
const day = process.argv[2] || new Date().toISOString().slice(0, 10);
const rows = db.prepare('SELECT id, title, source, publish_date FROM materials WHERE publish_date = ? ORDER BY id').all(day);
for (const r of rows) console.log(`${r.id} | ${r.source} | ${r.title}`);
console.log(`total ${day} = ${rows.length}`);
