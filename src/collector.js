// 采集器：负责发现文章链接、抓取并抽取正文（各来源定制解析）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const RAW_DIR = path.join(ROOT, 'data', 'raw');
fs.mkdirSync(RAW_DIR, { recursive: true });

export async function fetchHtml(url, timeoutMs = 20000) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

const ENTITY = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&ldquo;': '“', '&rdquo;': '”', '&lsquo;': '‘', '&rsquo;': '’', '&hellip;': '…',
  '&mdash;': '—', '&middot;': '·', '&times;': '×', '&divide;': '÷', '&mdash': '—',
  '&emsp;': ' ', '&ensp;': ' ', '&thinsp;': ' ', '&ndash;': '–', '&copy;': '©',
};

export function decodeEntities(s) {
  return s
    .replace(/&[a-zA-Z]+;/g, (m) => ENTITY[m] ?? m)
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
}

export function htmlToParagraphs(html) {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  t = decodeEntities(t);
  return t
    .split('\n')
    .map((l) => l.replace(/\u3000/g, ' ').trim())
    .filter((l) => l.length > 0);
}

// ---------- 人民日报（电子报）----------
export function dateFromRmrbUrl(url) {
  const m = url.match(/\/content\/(\d{4})(\d{2})\/(\d{2})\//);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function extractColumnFromTitle(title) {
  const m = title.match(/[（(]([^（）()]{2,10})[）)]\s*$/);
  return m ? m[1].trim() : '评论';
}

export function extractRmrbArticle(html, url) {
  const titleM = html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i);
  let title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : '';
  title = title.replace(/^人民日报\s*[-—]\s*/, '').trim();

  const start = html.indexOf('id="articleContent"');
  if (start === -1) throw new Error('未找到 articleContent 容器');
  const tagEnd = html.indexOf('>', start) + 1;
  // 结束标记：版权声明 / 版权信息区块（注意正文以 <!--enpcontent--> 开头，不可用 <!-- 作为结束）
  const tailMarks = ['版权声明', '人 民 网 版 权', '人民网版权所有', 'Copyright ©'];
  let end = html.length;
  for (const mk of tailMarks) {
    const i = html.indexOf(mk, tagEnd);
    if (i !== -1 && i < end) end = i;
  }
  const bodyHtml = html.slice(tagEnd, end);
  const raw = htmlToParagraphs(bodyHtml).filter((p) => p.length > 1);
  // 去重（该容器同时包含隐藏正文与可见正文副本）
  const seen = new Set();
  const deduped = [];
  for (const p of raw) {
    const k = p.replace(/\s/g, '');
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(p);
  }
  // 去掉标题行、署名行、版次信息行
  const body = deduped.filter((p) => {
    if (p === title) return false;
    if (/《人民日报》\s*（\d{4}年\d{1,2}月\d{1,2}日\s*第\s*\d+\s*版）/.test(p)) return false;
    // 纯中文姓名/短署名（如“常  钦”）
    if (/^[\u4e00-\u9fa5·\s]{2,10}$/.test(p)) return false;
    return true;
  });
  const date = dateFromRmrbUrl(url);
  return {
    title,
    date,
    column: extractColumnFromTitle(title),
    content: body.join('\n'),
    paragraphs: body,
    source: '人民日报',
    url,
  };
}

// 发现：某日某版（默认 05 版评论）
export async function discoverRmrbLayout(yyyy, mm, dd, page = '05') {
  const layoutUrl = `http://paper.people.com.cn/rmrb/pc/layout/${yyyy}${mm}/${dd}/node_${page}.html`;
  const html = await fetchHtml(layoutUrl);
  const items = [];
  const re = /href="([^"]*content_\d+\.html)"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const url = new URL(m[1], layoutUrl).toString();
    const title = decodeEntities(m[2]).trim();
    if (!title || /图片报道|版责编/.test(title)) continue;
    items.push({ title, url, column: extractColumnFromTitle(title) });
  }
  return { layoutUrl, items };
}

// ---------- 求是网 ----------
export function extractQstheory(html, url) {
  const titleM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let title = titleM ? (htmlToParagraphs(titleM[1])[0] || '') : '';
  if (!title) {
    const tm = html.match(/<title>([\s\S]*?)<\/title>/i);
    title = tm ? tm[1].replace(/\s*-\s*求是网\s*$/, '').trim() : '';
  }
  const dateM = url.match(/\/(\d{4})(\d{2})(\d{2})\//);
  const date = dateM ? `${dateM[1]}-${dateM[2]}-${dateM[3]}` : null;
  const start = html.indexOf('id="detailContent"');
  let bodyHtml = '';
  if (start !== -1) {
    const tagEnd = html.indexOf('>', start) + 1;
    let end = html.length;
    for (const mk of ['网站编辑', '扫描二维码分享到手机', '【网站声明】']) {
      const i = html.indexOf(mk, tagEnd);
      if (i !== -1 && i < end) end = i;
    }
    bodyHtml = html.slice(tagEnd, end);
  }
  const raw = htmlToParagraphs(bodyHtml).filter((p) => p.length > 1);
  const seen = new Set();
  const deduped = [];
  for (const p of raw) {
    const k = p.replace(/\s/g, '');
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(p);
  }
  const body = deduped.filter((p) => {
    if (p === title) return false;
    if (/^《求是》杂志(特约)?评论员$/.test(p)) return false;
    if (/^来源|^作者|^网站编辑|^扫描二维码/.test(p)) return false;
    if (/^[\u4e00-\u9fa5·\s]{2,10}$/.test(p)) return false;
    return true;
  });
  const isCommentator = /评论员/.test(html.slice(0, 6000));
  return {
    title,
    date,
    column: isCommentator ? '《求是》杂志评论员' : '《求是》',
    content: body.join('\n'),
    paragraphs: body,
    source: '求是网',
    url,
  };
}

// ---------- 通用正文抽取（共产党员网 等）----------
export function extractGenericArticle(html, url) {
  // 依站点常见的正文容器
  const ids = ['id="articleContent"', 'id="content"', 'class="article-content"', 'class="content"', 'class="TRS_Editor"', 'id="detailContent"', 'class="text"'];
  let start = -1, endTag = null;
  for (const id of ids) {
    const i = html.indexOf(id);
    if (i !== -1) { start = i; endTag = id; break; }
  }
  const titleM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
  let title = titleM ? (htmlToParagraphs(titleM[1])[0] || '').replace(/\s*[-_|]\s*(共产党员网|人民网|新华网|求是网).*$/, '').trim() : '';
  let bodyHtml = '';
  if (start !== -1) {
    const tagEnd = html.indexOf('>', start) + 1;
    // 取到常见尾部标记
    let end = html.length;
    for (const mk of ['责任编辑', '版权', '分享到', '网站编辑', '【', '相关阅读', '返回顶部']) {
      const i = html.indexOf(mk, tagEnd);
      if (i !== -1 && i < end) end = i;
    }
    bodyHtml = html.slice(tagEnd, end);
  } else {
    bodyHtml = html;
  }
  const raw = htmlToParagraphs(bodyHtml).filter((p) => p.replace(/\s/g, '').length >= 15);
  const seen = new Set();
  const deduped = [];
  for (const p of raw) {
    const k = p.replace(/\s/g, '');
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(p);
  }
  const body = deduped.filter((p) => p !== title && !/^[\u4e00-\u9fa5·\s]{2,10}$/.test(p));
  return { title, paragraphs: body, content: body.join('\n'), source: null, url };
}

// ---------- 通用正文抽取（求是网 / 共产党员网 等）----------
export function extractGeneric(html) {
  // 尝试常见的正文容器 class/id
  const containers = [
    /<div[^>]*id=["']?([^"'>]*article[^"'>]*)/i,
    /<div[^>]*class=["'][^"']*(?:content|article|txt|detail|main)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  let best = null;
  for (const re of containers) {
    const m = html.match(re);
    if (m) { best = m[0]; break; }
  }
  // 回退：取所有 <p> 段落中较长的中文段落
  const body = best || html;
  const paragraphs = htmlToParagraphs(body).filter((p) => p.replace(/\s/g, '').length >= 18);
  // 去重并保留顺序
  const seen = new Set();
  const out = [];
  for (const p of paragraphs) {
    const k = p.replace(/\s/g, '');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

// ---------- CLI ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'discover') {
    const [yyyy, mm, dd] = rest;
    discoverRmrbLayout(yyyy, mm, dd)
      .then((r) => console.log(JSON.stringify(r, null, 2)))
      .catch((e) => { console.error(e); process.exit(1); });
  } else if (cmd === 'extract') {
    const url = rest[0];
    fetchHtml(url)
      .then((h) => {
        const art = url.includes('paper.people.com.cn') ? extractRmrbArticle(h, url) : { paragraphs: extractGeneric(h) };
        console.log(JSON.stringify(art, null, 2));
      })
      .catch((e) => { console.error(e); process.exit(1); });
  } else {
    console.log('用法: node src/collector.js discover 2026 11 12 | extract <url>');
  }
}
