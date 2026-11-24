// 用本地 mock 验证视觉请求格式（不需要真实 Key）
import http from 'node:http';

const PORT = 9998;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch { /* ignore */ }
    const content = payload.messages?.[0]?.content || [];
    const hasImage = Array.isArray(content) && content.some(
      (p) => p.type === 'image_url' && String(p.image_url?.url || '').startsWith('data:image/')
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      model: payload.model,
      choices: [{ message: { content: hasImage ? '识别到题目：1+1=？ A.1 B.2' : 'NO_IMAGE' } }],
    }));
  });
});

await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

process.env.VISION_API_KEY = 'test-key';
process.env.VISION_BASE_URL = `http://127.0.0.1:${PORT}`;
process.env.VISION_MODEL = 'deepseek-v4.1-flash1017';

const { analyzeImage } = await import('../src/vision.js');
const r = await analyzeImage({ base64: Buffer.from('fake-image').toString('base64'), mime: 'image/png' });
console.log('text=', r.text);
console.log('model=', r.model);
const ok = r.text.includes('识别到题目');
console.log(ok ? 'MOCK PASS' : 'MOCK FAIL');
server.close();
process.exit(ok ? 0 : 1);
