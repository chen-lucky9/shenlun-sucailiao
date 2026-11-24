// 数据库模块：使用 Node 内置的 node:sqlite（零外部依赖）
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const DB_PATH = path.join(DATA_DIR, 'materials.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA foreign_keys = ON;`);

// ---------- 表结构 ----------
db.exec(`
CREATE TABLE IF NOT EXISTS topics (
  key          TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS materials (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  title              TEXT NOT NULL,
  column_name        TEXT NOT NULL DEFAULT '',
  publish_date       TEXT NOT NULL,
  source             TEXT NOT NULL DEFAULT '',
  source_url         TEXT NOT NULL UNIQUE,
  core_view          TEXT NOT NULL DEFAULT '',
  golden_sentences   TEXT NOT NULL DEFAULT '[]',
  argument_structure TEXT NOT NULL DEFAULT '',
  topics             TEXT NOT NULL DEFAULT '[]',
  writing_angles     TEXT NOT NULL DEFAULT '[]',
  summary            TEXT NOT NULL DEFAULT '',
  original_content   TEXT NOT NULL,
  organized_by       TEXT NOT NULL DEFAULT 'rule',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_materials_date ON materials(publish_date);
CREATE INDEX IF NOT EXISTS idx_materials_source ON materials(source);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(user_id, material_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS update_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  status        TEXT NOT NULL DEFAULT 'success',
  fetched_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  detail        TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS mistakes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  module          TEXT NOT NULL DEFAULT '',
  question_type   TEXT NOT NULL DEFAULT '',
  tags            TEXT NOT NULL DEFAULT '[]',
  question_text   TEXT NOT NULL,
  options         TEXT NOT NULL DEFAULT '',
  correct_answer  TEXT NOT NULL DEFAULT '',
  user_answer     TEXT NOT NULL DEFAULT '',
  error_type      TEXT NOT NULL DEFAULT '',
  summary         TEXT NOT NULL DEFAULT '',
  trigger_card    TEXT NOT NULL DEFAULT '',
  mastery         TEXT NOT NULL DEFAULT '未掌握',
  source          TEXT NOT NULL DEFAULT '',
  group_id        TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  review_count    INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_mistakes_module ON mistakes(module);
CREATE INDEX IF NOT EXISTS idx_mistakes_type ON mistakes(question_type);
CREATE INDEX IF NOT EXISTS idx_mistakes_error ON mistakes(error_type);
`);

// 兼容旧库：补充 organized_by 字段
{
  const cols = db.prepare(`PRAGMA table_info(materials)`).all();
  if (!cols.some((c) => c.name === 'organized_by')) {
    db.exec(`ALTER TABLE materials ADD COLUMN organized_by TEXT NOT NULL DEFAULT 'rule'`);
  }
}

// ---------- 8 大主题（英文 key 硬性要求）----------
const TOPICS = [
  ['law_enforcement', '行政执法', '民生服务、基层治理、行政执法、作风建设、党的建设', 1],
  ['rural_revitalization', '乡村振兴', '农业农村、粮食安全、脱贫攻坚', 2],
  ['business_environment', '营商环境', '民营经济、对外开放、统一大市场、消费升级', 3],
  ['sci_tech_innovation', '科技创新', '创新生态、新质生产力、人才工作、教育强国', 4],
  ['green_development', '绿色发展', '生态文明、生态治理、双碳、环境保护', 5],
  ['industrial_upgrading', '产业升级', '经济发展、高质量发展、制造业、未来产业', 6],
  ['digital_economy', '数字经济', '人工智能、数字中国、数字化转型', 7],
  ['cultural_confidence', '文化自信', '文化建设、文化出海、非遗、文博、文旅、爱国主义', 8],
];

const insertTopic = db.prepare(
  `INSERT INTO topics (key, label, description, sort_order) VALUES (?, ?, ?, ?)
   ON CONFLICT(key) DO UPDATE SET label=excluded.label, description=excluded.description, sort_order=excluded.sort_order`
);
for (const [key, label, desc, order] of TOPICS) {
  insertTopic.run(key, label, desc, order);
}

// ---------- 查询辅助 ----------
export function listTopics() {
  return db.prepare(`SELECT key, label, description, sort_order FROM topics ORDER BY sort_order`).all();
}

export function listMaterials({ topic, month, q, page = 1, limit = 20 } = {}) {
  const where = [];
  const params = [];
  if (topic) {
    // topics 字段以 JSON 数组存储，使用 LIKE 进行包含匹配（英文 key 唯一，无歧义）
    where.push(`topics LIKE ?`);
    params.push(`%"${topic}"%`);
  }
  if (month) {
    where.push(`publish_date LIKE ?`);
    params.push(`${month}%`);
  }
  if (q) {
    where.push(`(title LIKE ? OR summary LIKE ? OR original_content LIKE ? OR golden_sentences LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Math.max(1, page) - 1) * Math.max(1, limit);

  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM materials ${whereSql}`).get(...params);
  const rows = db
    .prepare(
      `SELECT id, title, column_name, publish_date, source, source_url, core_view, golden_sentences, argument_structure, topics, writing_angles, summary, original_content, organized_by
       FROM materials ${whereSql}
       ORDER BY publish_date DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, Math.max(1, limit), offset);

  return { total: totalRow.c, items: rows.map(deserializeMaterial) };
}

export function getMaterial(id) {
  const row = db
    .prepare(
      `SELECT id, title, column_name, publish_date, source, source_url, core_view, golden_sentences, argument_structure, topics, writing_angles, summary, original_content, organized_by
       FROM materials WHERE id = ?`
    )
    .get(id);
  return row ? deserializeMaterial(row) : null;
}

export function archiveByMonth() {
  const rows = db
    .prepare(
      `SELECT substr(publish_date,1,7) AS month,
              COUNT(*) AS count,
              MIN(publish_date) AS first_date,
              MAX(publish_date) AS last_date
       FROM materials GROUP BY substr(publish_date,1,7)
       ORDER BY month DESC`
    )
    .all();
  return rows;
}

export function stats() {
  const byTopic = db
    .prepare(
      `SELECT t.key, t.label, COUNT(m.id) AS count
       FROM topics t LEFT JOIN materials m ON m.topics LIKE '%"' || t.key || '"%'
       GROUP BY t.key ORDER BY t.sort_order`
    )
    .all();
  const bySource = db
    .prepare(`SELECT source, COUNT(*) AS count FROM materials GROUP BY source ORDER BY count DESC`)
    .all();
  const byMonth = db
    .prepare(
      `SELECT substr(publish_date,1,7) AS month, COUNT(*) AS count FROM materials GROUP BY substr(publish_date,1,7) ORDER BY month`
    )
    .all();
  const latest = db.prepare(`SELECT MAX(publish_date) AS d FROM materials`).get()?.d || null;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM materials`).get().c;
  return { total, latest, byTopic, bySource, byMonth };
}

function deserializeMaterial(row) {
  return {
    ...row,
    golden_sentences: safeParseArray(row.golden_sentences),
    topics: safeParseArray(row.topics),
    writing_angles: safeParseArray(row.writing_angles),
  };
}

function safeParseArray(str) {
  try {
    const v = JSON.parse(str || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ---------- 错题本 ----------
export function addMistake(d) {
  const r = db
    .prepare(
      `INSERT INTO mistakes
        (module, question_type, tags, question_text, options, correct_answer, user_answer, error_type, summary, trigger_card, mastery, source, group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      d.module || '',
      d.question_type || '',
      JSON.stringify(d.tags || []),
      d.question_text || '',
      d.options || '',
      d.correct_answer || '',
      d.user_answer || '',
      d.error_type || '',
      d.summary || '',
      d.trigger_card || '',
      d.mastery || '未掌握',
      d.source || '',
      d.group_id || ''
    );
  return { id: Number(r.lastInsertRowid) };
}

export function listMistakes({ module, question_type, error_type, mastery, q, limit = 50, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (module) { where.push('module = ?'); params.push(module); }
  if (question_type) { where.push('question_type = ?'); params.push(question_type); }
  if (error_type) { where.push('error_type = ?'); params.push(error_type); }
  if (mastery) { where.push('mastery = ?'); params.push(mastery); }
  if (q) { where.push('(question_text LIKE ? OR summary LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM mistakes ${whereSql}`).get(...params).c;
  const rows = db
    .prepare(`SELECT * FROM mistakes ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, Math.max(1, limit), Math.max(0, offset));
  return { total, items: rows.map((r) => ({ ...r, tags: safeParseArray(r.tags) })) };
}

export function updateMistake(id, d) {
  const fields = [];
  const params = [];
  for (const k of ['module', 'question_type', 'correct_answer', 'user_answer', 'error_type', 'summary', 'trigger_card', 'mastery', 'source']) {
    if (d[k] !== undefined) { fields.push(`${k} = ?`); params.push(d[k]); }
  }
  if (Array.isArray(d.tags)) { fields.push('tags = ?'); params.push(JSON.stringify(d.tags)); }
  if (d.reviewed) {
    fields.push('review_count = review_count + 1');
    fields.push("last_reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')");
  }
  if (!fields.length) return { changes: 0 };
  params.push(id);
  const r = db.prepare(`UPDATE mistakes SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return { changes: r.changes };
}

export function deleteMistake(id) {
  const r = db.prepare('DELETE FROM mistakes WHERE id = ?').run(id);
  return { changes: r.changes };
}

export function mistakeStats() {
  const total = db.prepare('SELECT COUNT(*) AS c FROM mistakes').get().c;
  const byModule = db.prepare('SELECT module AS name, COUNT(*) AS count FROM mistakes GROUP BY module ORDER BY count DESC').all();
  const byType = db.prepare('SELECT question_type AS name, COUNT(*) AS count FROM mistakes GROUP BY question_type ORDER BY count DESC').all();
  const byError = db.prepare('SELECT error_type AS name, COUNT(*) AS count FROM mistakes GROUP BY error_type ORDER BY count DESC').all();
  const byMastery = db.prepare('SELECT mastery AS name, COUNT(*) AS count FROM mistakes GROUP BY mastery ORDER BY count DESC').all();
  return { total, byModule, byType, byError, byMastery };
}
