// 校验离线 dist 包
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const dataJs = fs.readFileSync(path.join(DIST, 'data.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(dataJs, sandbox);
const D = sandbox.window.__SUCAI__;

const ids = new Set(D.materials.map((m) => m.id));
const bad = D.materials.filter((m) => !m.title || !m.topics.length || m.golden_sentences.length < 5 || !m.original_content || m.original_content.length <= 100);

const man = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.webmanifest'), 'utf8'));
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const appCode = fs.readFileSync(path.join(DIST, 'app.js'), 'utf8');

const checks = {
  'offline 标记': sandbox.window.__OFFLINE__ === true,
  '素材数=116': D.materials.length === 116,
  '主题数=8': D.topics.length === 8,
  '归档月数=23': D.months.length === 23,
  'id 唯一': ids.size === D.materials.length,
  '字段完整': bad.length === 0,
  'manifest 图标': man.icons.length === 3,
  'index 引入 data.js': html.includes('data.js'),
  'index 引入 app.js': html.includes('app.js'),
  'index 引入 manifest': html.includes('manifest.webmanifest'),
  'index 注册 SW': html.includes('serviceWorker'),
  'app 含 offlineApi': appCode.includes('offlineApi'),
  'app 含 localStorage 收藏': appCode.includes('FAV_KEY'),
  'icon-192': fs.existsSync(path.join(DIST, 'icons/icon-192.png')),
  'icon-512': fs.existsSync(path.join(DIST, 'icons/icon-512.png')),
  'maskable': fs.existsSync(path.join(DIST, 'icons/icon-maskable-512.png')),
};

let fail = 0;
for (const [k, v] of Object.entries(checks)) {
  console.log(`${v ? '✓' : '✗'} ${k}`);
  if (!v) fail++;
}
console.log(`\n离线包素材 ${D.materials.length} 篇，校验${fail ? '失败 ' + fail + ' 项' : '全部通过'}`);
process.exit(fail ? 1 : 0);
