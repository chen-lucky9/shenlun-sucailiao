// 探测指定 URL 的正文容器与抽取结果
const url = process.argv[2];
const html = await (await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' },
  signal: AbortSignal.timeout(20000),
  redirect: 'follow',
})).text();
const markers = ['rm_txt_con', 'class="text"', 'id="content"', 'article-content', 'TRS_Editor', 'rm_txt_content', 'text_c', 'id="detailContent"', 'class="article"', 'id="articleContent"'];
for (const k of markers) console.log(k, '=>', html.indexOf(k));
const m = await import('../src/collector.js');
const a = m.extractGenericArticle(html, url);
console.log('title=', a.title);
console.log('paras=', a.paragraphs.length, 'chars=', a.content.length);
console.log(a.paragraphs.slice(0, 5).map((p, i) => `[${i}] ${p.slice(0, 60)}`).join('\n'));
