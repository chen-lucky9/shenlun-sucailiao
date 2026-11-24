// 临时探针
const url = process.argv[2];
const html = await (await fetch(url, { signal: AbortSignal.timeout(20000) })).text();
const idx = html.indexOf('沃野千里');
console.log('count articleContent=', (html.match(/articleContent/g) || []).length);
console.log('bodyIdx=', idx);
const seg = html.slice(Math.max(0, idx - 1400), idx + 300);
console.log(seg.replace(/></g, '>\n<'));
