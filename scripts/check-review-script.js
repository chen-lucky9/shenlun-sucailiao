// 检查 review.html 内联脚本的语法（按 UTF-8 读取）
import fs from 'node:fs';

const html = fs.readFileSync('public/review.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.error('no script found');
  process.exit(1);
}
try {
  // 只解析、不执行
  new Function(m[1]);
  console.log('review.html inline script syntax OK');
} catch (e) {
  console.error('syntax error:', e.message);
  process.exit(1);
}
