// 将 SQLite WAL 合并回主库，确保提交到 git 的 materials.db 是完整数据
import { db, DB_PATH } from '../src/db.js';
try {
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  console.log('checkpoint ok:', DB_PATH);
} catch (e) {
  console.log('checkpoint warn:', e.message);
}
