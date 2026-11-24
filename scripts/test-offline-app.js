// 在 Node 中用最小 DOM 桩实际执行离线版 app.js，验证其可运行
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

function makeEl(sel = '') {
  const el = {
    _sel: sel,
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: true,
    dataset: {},
    style: {},
    onclick: null,
    onsubmit: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    focus() {},
    setAttribute() {},
    getAttribute() { return null; },
    appendChild() {},
  };
  return el;
}
const store = new Map();
const document = {
  querySelector(sel) {
    if (!store.has(sel)) store.set(sel, makeEl(sel));
    return store.get(sel);
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: makeEl('body'),
  createElement() { return makeEl(); },
};
const localStorage = {
  _d: {},
  getItem(k) { return k in this._d ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
const location = { hash: '', protocol: 'http:', href: 'http://x/' };
const windowObj = {
  __OFFLINE__: true,
  addEventListener() {},
  scrollTo() {},
  location,
  localStorage,
  document,
  setTimeout,
  clearTimeout,
};

const ctx = vm.createContext({
  window: windowObj,
  document,
  localStorage,
  location,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  console,
});

function run(file) {
  const code = fs.readFileSync(path.join(DIST, file), 'utf8');
  vm.runInContext(code, ctx, { filename: file });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.log(`✗ ${name} ${extra}`); }
}

run('data.js');
run('app.js');
await sleep(120);

const topicHtml = document.querySelector('#topic-grid').innerHTML;
const latestHtml = document.querySelector('#latest-list').innerHTML;
ok('首页主题入口渲染', topicHtml.includes('乡村振兴') || topicHtml.includes('topic-card'), topicHtml.slice(0, 60));
ok('首页最新素材渲染', latestHtml.includes('material-card'), latestHtml.slice(0, 60));

// 详情页
await ctx.renderDetail(1);
const appHtml = document.querySelector('#app').innerHTML;
ok('详情页渲染标题', appHtml.includes('detail-title'), appHtml.slice(0, 80));

// 收藏（离线 localStorage）
const favBtn = document.querySelector('#fav-btn');
ok('详情页有收藏按钮', !!favBtn && typeof favBtn.onclick === 'function');
if (favBtn && favBtn.onclick) {
  await favBtn.onclick();
  const favs = JSON.parse(localStorage.getItem('shenlun_favs_v1') || '[]');
  ok('离线收藏写入 localStorage', favs.includes(1), JSON.stringify(favs));
}

// 列表筛选（离线）
const list = await ctx.api('/api/materials?topic=rural_revitalization&limit=100');
ok('离线主题筛选', list.items.length >= 5 && list.items.every((m) => m.topics.includes('rural_revitalization')), String(list.items.length));

// 检索（离线）
const search = await ctx.api('/api/materials?q=' + encodeURIComponent('粮食') + '&limit=100');
ok('离线关键词检索', search.total > 0, String(search.total));

// 归档（离线）
const arch = await ctx.api('/api/archive');
ok('离线归档', arch.months.length === 23, String(arch.months.length));

console.log(`\n离线应用执行测试：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);
