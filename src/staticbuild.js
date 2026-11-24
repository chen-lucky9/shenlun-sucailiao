// 静态版构建核心：可被每日任务复用
import fs from 'node:fs';
import path from 'node:path';
import { db, listTopics, stats, archiveByMonth, ROOT } from './db.js';

export function buildStatic() {
  const DIST = path.join(ROOT, 'dist');
  const ICONS = path.join(DIST, 'icons');
  fs.mkdirSync(ICONS, { recursive: true });

  const topics = listTopics();
  const rows = db.prepare('SELECT * FROM materials ORDER BY publish_date DESC, id DESC').all();
  const materials = rows.map((r) => ({
    id: r.id,
    title: r.title,
    column_name: r.column_name,
    publish_date: r.publish_date,
    source: r.source,
    source_url: r.source_url,
    core_view: r.core_view,
    golden_sentences: JSON.parse(r.golden_sentences || '[]'),
    argument_structure: r.argument_structure,
    topics: JSON.parse(r.topics || '[]'),
    writing_angles: JSON.parse(r.writing_angles || '[]'),
    summary: r.summary,
    original_content: r.original_content,
    organized_by: r.organized_by || 'rule',
  }));
  const st = stats();
  const months = archiveByMonth();

  const payload = { topics, materials, stats: st, months };
  const dataJs = `/* 由每日任务自动生成，请勿手改 */\nwindow.__OFFLINE__ = true;\nwindow.__SUCAI__ = ${JSON.stringify(payload)};\n`;
  fs.writeFileSync(path.join(DIST, 'data.js'), dataJs, 'utf8');

  fs.copyFileSync(path.join(ROOT, 'public', 'styles.css'), path.join(DIST, 'styles.css'));
  fs.copyFileSync(path.join(ROOT, 'public', 'app.js'), path.join(DIST, 'app.js'));

  let html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  html = html.replace('href="/styles.css"', 'href="styles.css"');
  html = html.replace(
    '<meta name="apple-mobile-web-app-title" content="申论素材库" />',
    '<meta name="apple-mobile-web-app-title" content="申论素材库" />\n  <link rel="manifest" href="manifest.webmanifest" />\n  <link rel="icon" href="icons/icon-192.png" />\n  <link rel="apple-touch-icon" href="icons/icon-192.png" />'
  );
  html = html.replace('<title>申论素材库 · 公务员考试申论备考</title>', '<title>申论素材库 · 离线版</title>');
  html = html.replace(
    '<script src="/app.js" type="module"></script>',
    '<script src="data.js"></script>\n  <script src="app.js"></script>\n  <script>if (\'serviceWorker\' in navigator && location.protocol.startsWith(\'http\')) navigator.serviceWorker.register(\'sw.js\').catch(()=>{});</script>'
  );
  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

  const manifest = {
    name: '申论素材库',
    short_name: '申论素材',
    description: '公务员考试申论备考：权威评论与重要讲话素材库',
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf7f1',
    theme_color: '#a8322d',
    lang: 'zh-CN',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');

  const version = Date.now().toString(36);
  const sw = `const CACHE = 'shenlun-${version}';
const ASSETS = ['./index.html', './app.js', './styles.css', './data.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('/data.js')) {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => { const c = resp.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return resp; }).catch(() => caches.match('./index.html'))));
});
`;
  fs.writeFileSync(path.join(DIST, 'sw.js'), sw, 'utf8');

  return { dist: DIST, count: materials.length, dataKb: Math.round(fs.statSync(path.join(DIST, 'data.js')).size / 1024) };
}

export function buildSingleFile() {
  const DIST = path.join(ROOT, 'dist');
  let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(DIST, 'styles.css'), 'utf8');
  const dataJs = fs.readFileSync(path.join(DIST, 'data.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(DIST, 'app.js'), 'utf8');

  html = html.replace(/\s*<link rel="manifest"[^>]*>/g, '');
  html = html.replace(/\s*<link rel="icon"[^>]*>/g, '');
  html = html.replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '');
  html = html.replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`);

  const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
  html = html.replace(
    /<script src="data\.js"><\/script>\s*<script src="app\.js"><\/script>\s*<script>[\s\S]*?<\/script>/,
    `<script>\n${safe(dataJs)}\n</script>\n<script>\n${safe(appJs)}\n</script>`
  );

  const out = path.join(DIST, 'shenlun-offline.html');
  fs.writeFileSync(out, html, 'utf8');
  return { file: out, sizeKb: Math.round(fs.statSync(out).size / 1024) };
}

export function buildAll() {
  const a = buildStatic();
  const b = buildSingleFile();
  return { ...a, singleFile: b.file, singleKb: b.sizeKb };
}
