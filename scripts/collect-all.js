// 批量采集：人民日报评论版（逐月覆盖）
// 用法：
//   node scripts/collect-all.js --dry --from 2025-01 --to 2026-11
//   node scripts/collect-all.js --from 2025-01 --to 2026-11
import fs from 'node:fs';
import path from 'node:path';
import { fetchHtml, discoverRmrbLayout, extractRmrbArticle, htmlToParagraphs } from '../src/collector.js';
import { RAW_DIR } from '../src/collector.js';

const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf('--' + name);
  return i !== -1 ? argv[i + 1] : def;
}
const DRY = argv.includes('--dry');
const FROM = arg('from', '2025-01');
const TO = arg('to', '2026-11');

function monthList(from, to) {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  const out = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 解析某日版面“第05版：评论”
async function layoutMeta(yyyy, mm, dd, page = '05') {
  const layoutUrl = `http://paper.people.com.cn/rmrb/pc/layout/${yyyy}${mm}/${dd}/node_${page}.html`;
  const html = await fetchHtml(layoutUrl);
  const m = html.match(/第0?(\d+)版[：:]\s*([^<\s]+)/);
  return { layoutUrl, page, label: m ? m[2] : null };
}

// 找到该月含“评论”版的日期（优先 15 日，回退相邻日）
async function findCommentDay(yyyy, mm) {
  const [y, m] = [Number(yyyy), Number(mm)];
  const daysInMonth = new Date(y, m, 0).getDate();
  const prefer = [15, 16, 14, 17, 13, 18, 12, 19, 11, 20];
  for (const d of prefer) {
    if (d > daysInMonth) continue;
    const dd = String(d).padStart(2, '0');
    for (const page of ['05', '06', '07']) {
      try {
        const meta = await layoutMeta(yyyy, mm, dd, page);
        if (meta.label && meta.label.includes('评论')) {
          return { dd, page, label: meta.label };
        }
      } catch { /* ignore */ }
      await delay(150);
    }
  }
  return null;
}

async function collectMonth(month) {
  const [yyyy, mm] = month.split('-');
  const lastThree = ['2026-09', '2026-10', '2026-11'].includes(month);
  const targetCount = lastThree ? 8 : 4;

  let found = await findCommentDay(yyyy, mm);
  if (!found) return { month, status: 'no-comment-day', articles: 0 };

  const { items } = await discoverRmrbLayout(yyyy, mm, found.dd, found.page);
  // 优先精选栏目
  const PREF = ['人民时评', '评论员观察', '现场评论', '社论', '本报评论员', '和音', '金台随笔', '人民论坛', '纵横', '大家谈', '国际论坛', '评论'];
  const picked = items
    .map((it) => ({ ...it, score: PREF.indexOf(it.column) }))
    .sort((a, b) => (a.score === -1 ? 99 : a.score) - (b.score === -1 ? 99 : b.score))
    .slice(0, targetCount);

  const saved = [];
  for (const it of picked) {
    if (DRY) { saved.push({ title: it.title, column: it.column, url: it.url }); continue; }
    const filename = `${yyyy}${found.dd}_${it.column}_${it.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 24)}.json`;
    const filePath = path.join(RAW_DIR, filename);
    if (fs.existsSync(filePath)) { saved.push({ title: it.title, column: it.column, file: filename, skipped: true }); continue; }
    try {
      const html = await fetchHtml(it.url);
      const art = extractRmrbArticle(html, it.url);
      if (!art.date) art.date = `${yyyy}-${mm}-${found.dd}`;
      if (art.paragraphs.length < 3) { saved.push({ title: it.title, error: 'too-few-paragraphs' }); continue; }
      fs.writeFileSync(filePath, JSON.stringify(art, null, 2), 'utf8');
      saved.push({ title: art.title, column: art.column, date: art.date, paras: art.paragraphs.length, file: filename });
    } catch (e) {
      saved.push({ title: it.title, error: e.message });
    }
    await delay(250);
  }
  return { month, day: found.dd, page: found.page, label: found.label, articles: saved.length, saved };
}

const months = monthList(FROM, TO);
console.log(`采集范围: ${FROM} ~ ${TO}，共 ${months.length} 个月，模式=${DRY ? 'DRY' : 'SAVE'}`);
const summary = [];
for (const m of months) {
  try {
    const r = await collectMonth(m);
    summary.push(r);
    console.log(`[${m}] ${r.status || 'ok'} day=${r.day || '-'} label=${r.label || '-'} saved=${r.saved ? r.saved.filter((s) => !s.error).length : 0}/${r.saved ? r.saved.length : 0}`);
    if (r.saved) for (const s of r.saved) console.log(`    ${s.error ? '✗' : '✓'} ${s.column || ''} ${s.title || ''} ${s.error || ''}`);
  } catch (e) {
    console.log(`[${m}] ERROR ${e.message}`);
    summary.push({ month: m, status: 'error', error: e.message });
  }
  await delay(200);
}
fs.writeFileSync(path.join(RAW_DIR, '_sweep-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log('\n完成。汇总已写入 data/raw/_sweep-summary.json');
