// 本地 mock 的 DeepSeek 接口，仅用于端到端测试
import http from 'node:http';

const PORT = 9999;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch { /* ignore */ }
    const user = (payload.messages || []).find((m) => m.role === 'user')?.content || '';
    const content = user.split('原文全文：')[1]?.split('请严格按照')[0] || '';
    const paras = content.split('\n').map((p) => p.trim()).filter((p) => p.length > 30);
    const golden = paras.slice(0, 5).map((p) => p.slice(0, 40));
    const result = {
      core_view: '【模拟】核心观点',
      golden_sentences: golden,
      argument_structure: '【模拟】论证结构',
      topics: ['law_enforcement'],
      writing_angles: ['角度一', '角度二', '角度三'],
      summary: '【模拟】摘要',
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }));
  });
});
server.listen(PORT, '127.0.0.1', () => console.log('mock llm on ' + PORT));
