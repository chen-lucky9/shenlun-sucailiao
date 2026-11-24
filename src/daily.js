// 每日更新任务：抓取最新评论 -> 整理 -> 去重入库 -> 生成当日整理文档
import fs from 'node:fs';
import path from 'node:path';
import { db, ROOT } from './db.js';
import { discoverRmrbLayout, fetchHtml, extractRmrbArticle, extractQstheory } from './collector.js';
import { organizeRawArticle, TOPIC_LABELS } from './organizer.js';

const DAILY_DIR = path.join(ROOT, 'data', 'daily');
fs.mkdirSync(DAILY_DIR, { recursive: true });

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const ymdDash = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const upsert = db.prepare(`
INSERT INTO materials
  (title, column_name, publish_date, source, source_url, core_view, golden_sentences, argument_structure, topics, writing_angles, summary, original_content)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(source_url) DO NOTHING
`);

function exists(url) {
  return !!db.prepare('SELECT id FROM materials WHERE source_url = ?').get(url);
}

// 1) 人民日报评论版（当日或就近日期）
async function fetchRmrb(target) {
  const out = [];
  for (let back = 0; back <= 3; back++) {
    const d = new Date(target.getTime() - back * 86400000);
    try {
      const { items } = await discoverRmrbLayout(String(d.getFullYear()), pad(d.getMonth() + 1), pad(d.getDate()), '05');
      for (const it of items) {
        if (exists(it.url)) continue;
        try {
          const html = await fetchHtml(it.url);
          const art = extractRmrbArticle(html, it.url);
          if (art.content && art.content.length > 200) out.push({ ...art, source: '人民日报', column: it.column || art.column });
        } catch { /* ignore single */ }
      }
      if (out.length) break;
    } catch { /* try earlier day */ }
  }
  return out;
}

// 2) 求是网社论评论（解析列表页首屏）
async function fetchQstheory(target) {
  try {
    const html = await fetchHtml('https://www.qstheory.cn/v9zhuanqu/zhuanqu/slpl/');
    const re = /<a[^>]*href="(https:\/\/www\.qstheory\.cn\/(\d{4})(\d{2})(\d{2})\/[0-9a-f]+\/c\.html)"[^>]*>([\s\S]*?)<\/a>/g;
    const cands = [];
    let m;
    const want = ymd(target);
    while ((m = re.exec(html))) {
      const [, url, y, mo, dd, title] = m;
      if (y + mo + dd !== want) continue;
      const t = title.replace(/<[^>]+>/g, '').trim();
      if (t.length > 6) cands.push({ url, title: t });
    }
    const out = [];
    for (const c of cands.slice(0, 4)) {
      if (exists(c.url)) continue;
      try {
        const h = await fetchHtml(c.url);
        const art = extractQstheory(h, c.url);
        if (art.content && art.content.length > 200) out.push({ ...art, source: '求是网', column: art.column || '《求是》杂志评论员' });
      } catch { /* ignore */ }
    }
    return out;
  } catch {
    return [];
  }
}

// 3) 共产党员网（首页文章链接中取当日）
async function fetch12371(target) {
  try {
    const html = await fetchHtml('https://www.12371.cn/');
    const want = ymd(target);
    const re = /<a[^>]*href="(https:\/\/www\.12371\.cn\/\d{4}\/\d{2}\/\d{2}\/ARTI\d+\.shtml)"[^>]*>([\s\S]*?)<\/a>/g;
    const cands = [];
    let m;
    while ((m = re.exec(html))) {
      const url = m[1];
      const t = m[2].replace(/<[^>]+>/g, '').trim();
      const dm = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
      if (!dm || dm[1] + dm[2] + dm[3] !== want) continue;
      if (t.length > 6) cands.push({ url, title: t });
    }
    const out = [];
    for (const c of cands.slice(0, 4)) {
      if (exists(c.url)) continue;
      try {
        const h = await fetchHtml(c.url);
        const tmp = { title: c.title, date: ymdDash(target), source: '共产党员网', url: c.url, content: '' };
        // 用通用抽取
        const { paragraphs } = await import('./collector.js').then((mm) => ({ paragraphs: mm.extractGenericArticle(h, c.url).paragraphs }));
        tmp.content = (paragraphs || []).join('\n');
        if (tmp.content.length > 200) out.push(tmp);
      } catch { /* ignore */ }
    }
    return out;
  } catch {
    return [];
  }
}

function writeDailyDoc(inserted, runDate) {
  const dateStr = ymdDash(runDate);
  const lines = [];
  lines.push(`# 申论素材日报 · ${dateStr}`);
  lines.push('');
  lines.push(`> 本日自动抓取并整理入库 ${inserted.length} 篇高质量评论/讲话素材。`);
  lines.push('');
  if (!inserted.length) lines.push('今日暂无可入库的新素材（可能已入库或来源暂无更新）。');
  for (const a of inserted) {
    const topicNames = (a.topics || []).map((k) => TOPIC_LABELS[k] || k).join('、');
    lines.push(`## ${a.title}`);
    lines.push('');
    lines.push(`- **栏目/作者**：${a.column_name}`);
    lines.push(`- **发布日期**：${a.publish_date}`);
    lines.push(`- **来源**：${a.source}（${a.source_url}）`);
    lines.push(`- **申论主题**：${topicNames}`);
    lines.push('');
    lines.push(`**核心观点**：${a.core_view}`);
    lines.push('');
    lines.push(`**金句摘录**：`);
    for (const g of a.golden_sentences || []) lines.push(`- ${g}`);
    lines.push('');
    lines.push(`**论证结构**：${a.argument_structure}`);
    lines.push('');
    lines.push(`**写作角度**：`);
    for (const w of a.writing_angles || []) lines.push(`- ${w}`);
    lines.push('');
    lines.push(`**摘要**：${a.summary}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  const file = path.join(DAILY_DIR, `${dateStr}.md`);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  return file;
}

// 跨进程锁：避免「服务端定时器」与「系统计划任务」同时执行
const LOCK_FILE = path.join(ROOT, 'data', '.daily.lock');
function acquireLock() {
  try {
    const st = fs.statSync(LOCK_FILE);
    if (Date.now() - st.mtimeMs < 15 * 60 * 1000) return false;
    fs.unlinkSync(LOCK_FILE);
  } catch { /* 无锁 */ }
  try {
    fs.writeFileSync(LOCK_FILE, String(Date.now()), { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}
function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}

export async function runDailyUpdate({ manual = false, date = new Date() } = {}) {
  const startedAt = new Date().toISOString();
  const results = { runAt: startedAt, manual, fetched: 0, inserted: 0, skipped: 0, items: [] };
  if (!acquireLock()) {
    console.log('[daily] 已有更新任务在执行，跳过本次');
    return { ...results, skipped: true, reason: 'locked' };
  }
  try {
    const [rmrb, qs, cpc] = await Promise.all([
      fetchRmrb(date).catch(() => []),
      fetchQstheory(date).catch(() => []),
      fetch12371(date).catch(() => []),
    ]);
    const raws = [...rmrb, ...qs, ...cpc];
    results.fetched = raws.length;

    const inserted = [];
    for (const r of raws) {
      if (exists(r.url)) { results.skipped++; continue; }
      const a = organizeRawArticle(r);
      if (!a.original_content || a.original_content.length <= 100) { results.skipped++; continue; }
      try {
        const res = upsert.run(
          a.title, a.column_name, a.publish_date, a.source, a.source_url,
          a.core_view, JSON.stringify(a.golden_sentences), a.argument_structure,
          JSON.stringify(a.topics), JSON.stringify(a.writing_angles), a.summary, a.original_content
        );
        if (res.changes > 0) { inserted.push(a); results.inserted++; }
        else results.skipped++;
      } catch { results.skipped++; }
    }
    results.items = inserted.map((a) => ({ title: a.title, source: a.source, date: a.publish_date }));

    const docFile = writeDailyDoc(inserted, date);
    results.doc = docFile;

    db.prepare(`INSERT INTO update_log (run_at, status, fetched_count, inserted_count, skipped_count, detail) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(startedAt, 'success', results.fetched, results.inserted, results.skipped, docFile);

    // 自动重建离线版（PWA + 单文件），实现无人值守
    try {
      const { buildAll } = await import('./staticbuild.js');
      results.rebuilt = buildAll();
      console.log(`[daily] 离线版已重建：${results.rebuilt.count} 篇，单文件 ${results.rebuilt.singleKb} KB`);
    } catch (e) {
      console.error('[daily] 重建离线版失败：', e.message);
    }

    console.log(`[daily] ${startedAt} 抓取 ${results.fetched}，入库 ${results.inserted}，跳过 ${results.skipped}，文档 ${docFile}`);
    return results;
  } catch (e) {
    db.prepare(`INSERT INTO update_log (run_at, status, fetched_count, inserted_count, skipped_count, detail) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(startedAt, 'error', results.fetched, results.inserted, results.skipped, e.message);
    throw e;
  } finally {
    releaseLock();
  }
}

// 每天 07:30 触发
export function startScheduler() {
  const targetHour = 7;
  const targetMin = 30;
  function scheduleNext() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(targetHour, targetMin, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next - now;
    console.log(`[scheduler] 下次自动更新：${next.toLocaleString('zh-CN')}（约 ${Math.round(ms / 60000)} 分钟后）`);
    setTimeout(async () => {
      try {
        await runDailyUpdate({ manual: false });
      } catch (e) {
        console.error('[scheduler] 每日更新失败：', e.message);
      }
      scheduleNext();
    }, ms);
  }
  scheduleNext();
}

// 直接运行时执行一次
if (process.argv[1] && path.resolve(process.argv[1]).endsWith('daily.js')) {
  runDailyUpdate({ manual: true }).then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }).catch((e) => { console.error(e); process.exit(1); });
}
