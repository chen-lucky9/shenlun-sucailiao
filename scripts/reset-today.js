// 删除当日由每日任务新增的人民日报素材（便于用修复后的整理器重新入库）
import { db } from '../src/db.js';
const r = db.prepare("DELETE FROM materials WHERE publish_date = ? AND source = ?").run(process.argv[2] || '2026-11-24', '人民日报');
console.log('deleted', r.changes);
