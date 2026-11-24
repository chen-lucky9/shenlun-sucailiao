// 用真实图片测试视觉接口
// 用法：
//   $env:VISION_API_KEY="sk-..."
//   $env:VISION_MODEL="deepseek-v4.1-flash1017"   # 换成你的视觉模型名
//   node scripts/test-vision.js "C:\path\to\question.jpg"
import fs from 'node:fs';
import path from 'node:path';
import { analyzeImage, visionEnabled, visionModel } from '../src/vision.js';

const file = process.argv[2];
if (!file) {
  console.error('用法: node scripts/test-vision.js <图片路径>');
  process.exit(1);
}
if (!visionEnabled()) {
  console.error('请先设置 VISION_API_KEY（或 DEEPSEEK_API_KEY）');
  process.exit(1);
}

const buf = fs.readFileSync(file);
const ext = path.extname(file).toLowerCase();
const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
console.log(`model=${visionModel()} image=${file} bytes=${buf.length} mime=${mime}`);

try {
  const r = await analyzeImage({ base64: buf.toString('base64'), mime });
  console.log('model returned=', r.model);
  console.log('--- text ---');
  console.log(r.text);
} catch (e) {
  console.error('ERR:', e.message);
  process.exit(1);
}
