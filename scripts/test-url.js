// 测试 URL 可达性
const url = process.argv[2];
try {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
  const t = await r.text();
  console.log('status=', r.status, 'len=', t.length);
  console.log(t.slice(0, 120).replace(/\s+/g, ' '));
} catch (e) {
  console.log('ERR', e.message, e.cause?.message || '');
}
