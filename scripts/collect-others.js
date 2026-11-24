// 采集求是网 / 共产党员网 / 重要讲话 的指定文章，保存到 data/raw
import fs from 'node:fs';
import path from 'node:path';
import { RAW_DIR, fetchHtml, extractRmrbArticle, extractQstheory, extractGenericArticle } from '../src/collector.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 每项: { url, source, column, kind: 'rmrb'|'qstheory'|'generic' }
const TARGETS = [
  // ---- 人民日报补充（补齐近3个月乡村振兴）----
  { url: 'https://paper.people.com.cn/rmrb/pc/content/202611/12/content_30190820.html', source: '人民日报', column: '人民时评', kind: 'rmrb' },
  { url: 'http://paper.people.com.cn/rmrb/pc/content/202611/13/content_30190987.html', source: '人民日报', column: '评论', kind: 'rmrb' },

  // ---- 求是网 ----
  { url: 'https://www.qstheory.cn/20261114/d25e06be30a84df5a54d1332f29df4d8/c.html', source: '求是网', column: '《求是》杂志评论员', kind: 'qstheory' },
  { url: 'https://www.qstheory.cn/20261114/3de18b29732c4c17a03c2bec2027b70f/c.html', source: '求是网', column: '《求是》杂志评论员', kind: 'qstheory' },
  { url: 'https://www.qstheory.cn/20261015/9d952f955fd34b64bcc90ed192e0f523/c.html', source: '求是网', column: '《求是》杂志评论员', kind: 'qstheory' },
  { url: 'https://www.qstheory.cn/20260930/7954896185e440418eb2aa25a2628aac/c.html', source: '求是网', column: '《求是》杂志评论员', kind: 'qstheory' },
  { url: 'https://www.qstheory.cn/20260831/55155cd732b545f89e406bd344f2c539/c.html', source: '求是网', column: '《求是》杂志评论员', kind: 'qstheory' },
  { url: 'https://www.qstheory.cn/20260715/01c61f4ff2af4af8bc50757dfff4976e/c.html', source: '求是网', column: '《求是》杂志评论员', kind: 'qstheory' },
  { url: 'https://www.qstheory.cn/20261104/819b0f478fde47c2a43c17c53dfef680/c.html', source: '求是网', column: '求是', kind: 'qstheory' },
  { url: 'https://www.qstheory.cn/20261114/807bb1c4081c4516943f93c1176586dd/c.html', source: '求是网', column: '求是', kind: 'qstheory' },
  { url: 'https://www.qstheory.cn/20261114/be569ee3261647a2a5f95aeb8161c7a9/c.html', source: '求是网', column: '求是', kind: 'qstheory' },

  // ---- 共产党员网 ----
  { url: 'https://www.12371.cn/2026/11/10/ARTI1794272808705415.shtml', source: '共产党员网', column: '先锋评论', kind: 'generic' },
  { url: 'https://www.12371.cn/2026/11/24/ARTI1795481778701575.shtml', source: '共产党员网', column: '基层党建', kind: 'generic' },
  { url: 'https://www.12371.cn/2026/11/24/ARTI1795481305159414.shtml', source: '共产党员网', column: '总书记的人民情怀', kind: 'generic' },
  { url: 'https://www.12371.cn/2026/10/28/ARTI1793153638193581.shtml', source: '共产党员网', column: '党员教育', kind: 'generic' },
  { url: 'https://www.12371.cn/2026/11/24/ARTI1795488058900310.shtml', source: '共产党员网', column: '党员教育', kind: 'generic' },
  { url: 'https://www.12371.cn/2026/10/26/ARTI1792984886762320.shtml', source: '共产党员网', column: '党旗在基层一线高高飘扬', kind: 'generic' },

  // ---- 重要讲话 ----
  { url: 'http://jhsjk.people.cn/article/40833131?isindex=1', source: '重要讲话', column: '重要讲话', kind: 'generic' },
  { url: 'http://jhsjk.people.cn/article/40836686?isindex=1', source: '重要讲话', column: '重要讲话', kind: 'generic' },
  { url: 'http://jhsjk.people.cn/article/40836684?isindex=1', source: '重要讲话', column: '重要讲话', kind: 'generic', date: '2026-11-19' },
  { url: 'https://www.12371.cn/2026/10/22/ARTI1792649104399392.shtml', source: '重要讲话', column: '重要讲话', kind: 'generic' },
  { url: 'https://www.qstheory.cn/20261114/6ad1a06b126a40cc81172a7cdd249cca/c.html', source: '重要讲话', column: '重要讲话', kind: 'qstheory' },
];

function dateFromUrl(url) {
  let m = url.match(/\/content\/(\d{4})(\d{2})\/(\d{2})\//);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = url.match(/\/(\d{4})(\d{2})(\d{2})\//);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function cleanParagraphs(paras, title) {
  const out = [];
  for (const p of paras) {
    const t = p.trim();
    if (!t) continue;
    if (t === title) continue;
    if (t.includes(title) && t.includes('共产党员网')) continue;
    if (/^(学习贯彻|党的二十|习近平新时代|全国党员|深入贯彻|党纪学习|总书记的人民情怀)/.test(t) && t.length < 22) continue;
    if (/^来源[:：]|^发布时间[:：]|^责任编辑|^扫描二维码|^分享到/.test(t)) continue;
    if (/^[\u4e00-\u9fa5·\s]{2,8}$/.test(t)) continue;
    out.push(t);
  }
  // 丢弃开头的导航性短句，定位到第一段“正文”（较长且含句号）
  let start = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i].length >= 40 && /[。！？]/.test(out[i])) { start = i; break; }
  }
  return out.slice(start);
}

const results = [];
for (const t of TARGETS) {
  try {
    const html = await fetchHtml(t.url);
    let art;
    if (t.kind === 'rmrb') art = extractRmrbArticle(html, t.url);
    else if (t.kind === 'qstheory') art = extractQstheory(html, t.url);
    else {
      art = extractGenericArticle(html, t.url);
      // 解析日期
      const dateM = (art.paragraphs || []).join('\n').match(/发布时间[:：]\s*(\d{4}-\d{2}-\d{2})/);
      if (!art.date) art.date = dateM ? dateM[1] : dateFromUrl(t.url);
    }
    art.source = t.source;
    art.column = t.column;
    if (t.date) art.date = t.date;
    if (!art.date) art.date = dateFromUrl(t.url);
    const cleaned = cleanParagraphs(art.paragraphs || [], art.title);
    art.paragraphs = cleaned;
    art.content = cleaned.join('\n');

    if (!art.date) { results.push({ url: t.url, error: '无日期' }); continue; }
    if (art.content.length < 300) { results.push({ url: t.url, title: art.title, error: `正文过短(${art.content.length})` }); continue; }

    const filename = `${art.date.replace(/-/g, '')}_${t.source}_${art.title.replace(/[\\/:*?"<>|※]/g, '').slice(0, 24)}.json`;
    fs.writeFileSync(path.join(RAW_DIR, filename), JSON.stringify(art, null, 2), 'utf8');
    results.push({ url: t.url, title: art.title, date: art.date, source: t.source, chars: art.content.length, file: filename });
    console.log(`✓ ${t.source} ${art.date} ${art.title} (${art.content.length}字)`);
  } catch (e) {
    results.push({ url: t.url, error: e.message });
    console.log(`✗ ${t.url} -> ${e.message}`);
  }
  await delay(200);
}

fs.writeFileSync(path.join(RAW_DIR, '_others-summary.json'), JSON.stringify(results, null, 2), 'utf8');
console.log(`\n完成 ${results.filter((r) => !r.error).length}/${TARGETS.length}`);
