// 探测页面中的文章链接（紧凑输出，避免整页噪音）
// 用法: node scripts/links.js <url> [minTitleLen]
const url = process.argv[2];
const minLen = Number(process.argv[3] || 8);
const html = await (await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' },
  signal: AbortSignal.timeout(20000),
  redirect: 'follow',
})).text();

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'");
}
const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
let m;
const seen = new Set();
let n = 0;
while ((m = re.exec(html))) {
  let href = m[1];
  let text = decode(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  if (text.length < minLen) continue;
  if (!/\.(s?html?|php)/i.test(href) && !/\d{4,}/.test(href)) continue;
  try { href = new URL(href, url).toString(); } catch { continue; }
  if (seen.has(href)) continue;
  seen.add(href);
  console.log(`${text}\t${href}`);
  if (++n >= 200) break;
}
console.log(`\n# total links printed: ${n}`);
