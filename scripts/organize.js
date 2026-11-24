// 整理器入口：读取 data/raw 全部原文，整理为 data/articles.json
import fs from 'node:fs';
import path from 'node:path';
import { RAW_DIR, ROOT } from '../src/collector.js';
import { organizeRawArticle } from '../src/organizer.js';

const DATA_DIR = path.join(ROOT, 'data');
const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const articles = [];
const seenUrls = new Set();
const skipped = [];

for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(RAW_DIR, f), 'utf8')); }
  catch { skipped.push({ f, reason: '解析失败' }); continue; }

  const title = (j.title || '').trim();
  const content = (j.content || '').trim();
  if (!content || content.length < 300) { skipped.push({ f, reason: '正文过短' }); continue; }
  if (/^来论$/.test(title) || /^纵横$/.test(title)) { skipped.push({ f, reason: '栏目集合页' }); continue; }
  if (j.url && seenUrls.has(j.url)) { skipped.push({ f, reason: '重复URL' }); continue; }
  if (!j.date) { skipped.push({ f, reason: '无日期' }); continue; }
  if (j.url) seenUrls.add(j.url);

  articles.push(organizeRawArticle(j));
}

articles.sort((a, b) => (b.publish_date || '').localeCompare(a.publish_date || '') || a.title.localeCompare(b.title));

fs.writeFileSync(path.join(DATA_DIR, 'articles.json'), JSON.stringify(articles, null, 2), 'utf8');

const bySource = {}, byTopic = {}, byMonth = {};
for (const a of articles) {
  bySource[a.source] = (bySource[a.source] || 0) + 1;
  byMonth[a.publish_date.slice(0, 7)] = (byMonth[a.publish_date.slice(0, 7)] || 0) + 1;
  for (const t of a.topics) byTopic[t] = (byTopic[t] || 0) + 1;
}
console.log(`整理完成：${articles.length} 篇（跳过 ${skipped.length}）`);
console.log('按来源:', JSON.stringify(bySource));
console.log('按主题:', JSON.stringify(byTopic));
console.log('按月:', JSON.stringify(byMonth));
if (skipped.length) console.log('跳过明细:', skipped.map((s) => `${s.f}:${s.reason}`).join(' | '));
