// 打印某 URL 的抽取前几段
const url = process.argv[2];
const html = await (await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' },
  signal: AbortSignal.timeout(20000),
  redirect: 'follow',
})).text();
const m = await import('../src/collector.js');
const a = m.extractGenericArticle(html, url);
console.log('title=', a.title);
console.log('chars=', a.content.length, 'paras=', a.paragraphs.length);
console.log(a.paragraphs.slice(0, 6).map((p, i) => `[${i}] ${p.slice(0, 90)}`).join('\n'));
