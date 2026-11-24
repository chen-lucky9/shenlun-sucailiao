// 申论素材库 前端应用（原生 JS，哈希路由）
const $ = (sel, root = document) => root.querySelector(sel);

const state = {
  user: null,
  topics: [],
  list: { items: [], total: 0, page: 1, params: {} },
};

const TOPIC_COLORS = {}; // 预留

// 离线 PWA 模式：window.__OFFLINE__ + window.__SUCAI__（由 data.js 注入）
const OFFLINE = !!window.__OFFLINE__;
const DATA = window.__SUCAI__ || null;

// ---------- API ----------
async function api(path, opts = {}) {
  if (OFFLINE) return offlineApi(path, opts);
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败(${res.status})`);
  return data;
}

// ---------- 离线数据层（PWA / 静态版）----------
const FAV_KEY = 'shenlun_favs_v1';
function readFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}
function writeFavs(arr) { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); }

function offlineApi(path, opts = {}) {
  if (!DATA) throw new Error('离线数据未加载');
  const [pathname, queryStr] = path.split('?');
  const params = new URLSearchParams(queryStr || '');
  const method = (opts.method || 'GET').toUpperCase();

  if (pathname === '/api/topics') return { topics: DATA.topics };
  if (pathname === '/api/stats') return DATA.stats;
  if (pathname === '/api/archive') return { months: DATA.months };

  if (pathname === '/api/materials') {
    const topic = params.get('topic') || '';
    const month = params.get('month') || '';
    const q = (params.get('q') || '').trim().toLowerCase();
    const page = Number(params.get('page') || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 20)));
    let items = DATA.materials;
    if (topic) items = items.filter((m) => m.topics.includes(topic));
    if (month) items = items.filter((m) => m.publish_date.startsWith(month));
    if (q) {
      items = items.filter((m) => {
        const hay = (m.title + m.summary + (m.golden_sentences || []).join('') + m.original_content).toLowerCase();
        return hay.includes(q);
      });
    }
    items = items.slice().sort((a, b) => b.publish_date.localeCompare(a.publish_date) || b.id - a.id);
    const total = items.length;
    const start = (Math.max(1, page) - 1) * limit;
    return { total, items: items.slice(start, start + limit) };
  }

  const dm = pathname.match(/^\/api\/materials\/(\d+)$/);
  if (dm) {
    const m = DATA.materials.find((x) => x.id === Number(dm[1]));
    if (!m) throw new Error('素材不存在');
    return { material: m };
  }

  if (pathname === '/api/auth/me') return { user: { id: 0, username: '本地用户' } };
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register' || pathname === '/api/auth/logout') {
    return { ok: true, user: { id: 0, username: '本地用户' } };
  }

  if (pathname === '/api/favorites' && method === 'GET') {
    const ids = readFavs();
    const favorites = DATA.materials
      .filter((m) => ids.includes(m.id))
      .map((m) => ({ id: m.id, title: m.title, publish_date: m.publish_date, source: m.source, topics: m.topics, column_name: m.column_name }));
    return { favorites };
  }

  const fm = pathname.match(/^\/api\/favorites\/(\d+)$/);
  if (fm) {
    const id = Number(fm[1]);
    if (method === 'POST') {
      const ids = readFavs();
      if (!ids.includes(id)) ids.push(id);
      writeFavs(ids);
      return { ok: true, favorited: true };
    }
    writeFavs(readFavs().filter((x) => x !== id));
    return { ok: true, favorited: false };
  }

  throw new Error('离线模式不支持该接口');
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 2200);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(d) {
  return d || '';
}

function topicLabel(key) {
  const t = state.topics.find((x) => x.key === key);
  return t ? t.label : key;
}

// ---------- 初始化 ----------
async function init() {
  try {
    state.topics = (await api('/api/topics')).topics;
  } catch (e) {
    console.error(e);
  }
  if (OFFLINE) {
    state.user = { id: 0, username: '本地用户' };
  } else {
    try {
      state.user = (await api('/api/auth/me')).user;
    } catch {}
  }
  renderAuthArea();
  window.addEventListener('hashchange', route);
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#search-input').value.trim();
    if (q) location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });
  route();
}

function renderAuthArea() {
  const area = $('#auth-area');
  if (OFFLINE) {
    area.innerHTML = `<span class="who">本地收藏</span>`;
    return;
  }
  if (state.user) {
    area.innerHTML = `<span class="who">${esc(state.user.username)}</span>
      <button class="btn-mini" id="logout-btn">退出</button>`;
    $('#logout-btn').onclick = async () => {
      await api('/api/auth/logout', { method: 'POST' });
      state.user = null;
      renderAuthArea();
      toast('已退出登录');
      route();
    };
  } else {
    area.innerHTML = `<button class="btn-mini" id="login-btn">登录 / 注册</button>`;
    $('#login-btn').onclick = () => openAuthModal('login');
  }
}

// ---------- 路由 ----------
function route() {
  const raw = location.hash.slice(1) || '/';
  const [pathPart, queryPart] = raw.split('?');
  const q = new URLSearchParams(queryPart || '');

  window.scrollTo(0, 0);

  // 顶栏高亮
  document.querySelectorAll('.nav a').forEach((a) => a.classList.remove('active'));
  const navMap = { '/': 'home', '/archive': 'archive', '/favorites': 'favorites' };
  if (navMap[pathPart]) document.querySelector(`.nav a[data-nav="${navMap[pathPart]}"]`)?.classList.add('active');

  // 手机底部导航高亮
  document.querySelectorAll('.mobile-nav a').forEach((a) => a.classList.remove('active'));
  const mnavMap = { '/': 'home', '/archive': 'archive', '/favorites': 'favorites', '/search': 'search' };
  if (mnavMap[pathPart]) document.querySelector(`.mobile-nav a[data-mnav="${mnavMap[pathPart]}"]`)?.classList.add('active');

  if (pathPart === '/' || pathPart === '') return renderHome();
  if (pathPart === '/archive') return renderArchive(q.get('month'));
  if (pathPart === '/favorites') return renderFavorites();
  if (pathPart === '/search') return renderSearch(q.get('q') || '');
  const tm = pathPart.match(/^\/topic\/([a-z_]+)$/);
  if (tm) return renderTopic(tm[1]);
  const dm = pathPart.match(/^\/material\/(\d+)$/);
  if (dm) return renderDetail(Number(dm[1]));
  renderNotFound();
}

const app = () => $('#app');

function setLoading() {
  app().innerHTML = `<div class="loading">加载中…</div>`;
}

// ---------- 首页 ----------
async function renderHome() {
  setLoading();
  let statsData = {};
  try { statsData = await api('/api/stats'); } catch {}
  let latest = { items: [], total: 0 };
  try { latest = await api('/api/materials?limit=9'); } catch {}

  const topicCounts = Object.fromEntries((statsData.byTopic || []).map((t) => [t.key, t.count]));

  app().innerHTML = `
    <section class="hero">
      <div>
        <h1>把权威评论，读成申论高分素材</h1>
        <p>聚合人民日报「人民时评」「评论员观察」「社论」等栏目、求是网、共产党员网与领导人重要讲话，按申论主题分类整理，支持检索、收藏与历史归档。</p>
        <div class="angle-list">
          <span class="badge src">人民日报</span>
          <span class="badge src">求是网</span>
          <span class="badge src">共产党员网</span>
          <span class="badge src">重要讲话</span>
        </div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b>${statsData.total || 0}</b><span>篇核心素材</span></div>
        <div class="hero-stat"><b>${(statsData.byMonth || []).length}</b><span>个月历史归档</span></div>
        <div class="hero-stat"><b>${fmtDate(statsData.latest) || '—'}</b><span>最新收录</span></div>
      </div>
    </section>

    <div class="section-title"><h2>八大申论主题</h2><span class="count">点击进入分类浏览</span></div>
    <div class="topic-grid" id="topic-grid"></div>

    <div class="section-title"><h2>最新素材</h2><span class="count">按发布日期倒序</span></div>
    <div class="material-list" id="latest-list"></div>
    <div class="pager"><a class="btn-ghost" href="#/archive">查看全部历史归档 →</a></div>
  `;

  $('#topic-grid').innerHTML = state.topics
    .map(
      (t) => `<div class="topic-card" data-topic="${esc(t.key)}">
        <div class="tc-label">${esc(t.label)}</div>
        <div class="tc-desc">${esc(t.description)}</div>
        <div class="tc-count">${topicCounts[t.key] || 0} 篇素材</div>
      </div>`
    )
    .join('');
  $('#topic-grid').querySelectorAll('.topic-card').forEach((el) => {
    el.onclick = () => (location.hash = `#/topic/${el.dataset.topic}`);
  });

  $('#latest-list').innerHTML = latest.items.length
    ? latest.items.map(materialCardHtml).join('')
    : `<div class="empty">暂无素材，请先运行 <code>npm run seed</code> 导入数据。</div>`;
  bindMaterialCards($('#latest-list'));
}

// ---------- 素材卡片 ----------
function materialCardHtml(m) {
  const tps = (m.topics || []).map((k) => `<span class="mc-topic">${esc(topicLabel(k))}</span>`).join(' ');
  return `
  <article class="material-card" data-id="${m.id}">
    <div class="mc-top">
      <span class="badge src">${esc(m.source.split('·')[0])}</span>
      ${m.column_name ? `<span class="badge">${esc(m.column_name)}</span>` : ''}
      ${tps}
    </div>
    <h3 class="mc-title">${esc(m.title)}</h3>
    <p class="mc-summary">${esc(m.summary || m.core_view || '')}</p>
    <div class="mc-foot">
      <span>${esc(m.publish_date)}</span>
    </div>
  </article>`;
}

function bindMaterialCards(root) {
  root.querySelectorAll('.material-card').forEach((el) => {
    el.onclick = () => (location.hash = `#/material/${el.dataset.id}`);
  });
}

// ---------- 分类页 ----------
async function renderTopic(key) {
  setLoading();
  const t = state.topics.find((x) => x.key === key);
  const data = await api(`/api/materials?topic=${encodeURIComponent(key)}&limit=100`);
  state.list = { items: data.items, total: data.total, page: 1, params: { topic: key } };
  app().innerHTML = `
    <div class="page-head">
      <h1>${esc(t ? t.label : key)} <span class="muted" style="font-size:14px;font-weight:400">${esc(key)}</span></h1>
      <p>${esc(t ? t.description : '')} · 共 ${data.total} 篇</p>
    </div>
    <div class="material-list" id="list">${data.items.map(materialCardHtml).join('') || emptyHtml()}</div>`;
  bindMaterialCards($('#list'));
}

// ---------- 归档 ----------
async function renderArchive(month) {
  setLoading();
  const { months } = await api('/api/archive');
  let listData = { items: [], total: 0 };
  if (month) {
    listData = await api(`/api/materials?month=${encodeURIComponent(month)}&limit=100`);
  }
  app().innerHTML = `
    <div class="page-head"><h1>历史归档</h1><p>共 ${months.length} 个月，按月份查看全部素材</p></div>
    <div class="month-grid" id="month-grid"></div>
    <div class="section-title" style="margin-top:28px"><h2>${month ? esc(month) + ' 月素材' : '选择月份查看'}</h2><span class="count">${month ? listData.total + ' 篇' : ''}</span></div>
    <div class="material-list" id="list"></div>`;
  $('#month-grid').innerHTML = months
    .map(
      (m) => `<div class="month-row" data-month="${esc(m.month)}">
        <span class="mr-month">${esc(m.month)}</span>
        <span class="mr-dates">${esc(m.first_date)} ~ ${esc(m.last_date)}</span>
        <span class="mr-count">${m.count} 篇</span>
      </div>`
    )
    .join('');
  $('#month-grid').querySelectorAll('.month-row').forEach((el) => {
    el.onclick = () => (location.hash = `#/archive?month=${el.dataset.month}`);
  });
  if (month) {
    $('#list').innerHTML = listData.items.length ? listData.items.map(materialCardHtml).join('') : emptyHtml();
    bindMaterialCards($('#list'));
  } else {
    $('#list').innerHTML = `<div class="empty">请在上方选择月份查看该月全部素材。</div>`;
  }
}

// ---------- 搜索 ----------
async function renderSearch(q) {
  setLoading();
  const data = await api(`/api/materials?q=${encodeURIComponent(q)}&limit=100`);
  app().innerHTML = `
    <div class="search-hero">
      <h1>关键词检索</h1>
      <p class="muted">在标题、摘要、金句与原文全文中搜索，命中 ${data.total} 篇</p>
      <form class="search-big" id="search-big-form">
        <input id="search-big-input" type="search" value="${esc(q)}" placeholder="输入关键词，如：粮食安全、新质生产力、基层治理…" />
        <button class="btn-primary" type="submit">搜索</button>
      </form>
    </div>
    <div class="material-list" id="list">${data.items.length ? data.items.map(materialCardHtml).join('') : emptyHtml('没有找到相关素材，换个关键词试试。')}</div>`;
  bindMaterialCards($('#list'));
  $('#search-big-form').onsubmit = (e) => {
    e.preventDefault();
    const nq = $('#search-big-input').value.trim();
    location.hash = nq ? `#/search?q=${encodeURIComponent(nq)}` : '#/search';
  };
}

// ---------- 收藏 ----------
async function renderFavorites() {
  if (!state.user) {
    app().innerHTML = `
      <div class="page-head"><h1>我的收藏</h1><p>登录后可收藏重点素材</p></div>
      <div class="empty">
        你还没有登录。<br/><br/>
        <button class="btn-primary" id="go-login">登录 / 注册</button>
      </div>`;
    $('#go-login').onclick = () => openAuthModal('login');
    return;
  }
  setLoading();
  const { favorites } = await api('/api/favorites');
  app().innerHTML = `
    <div class="page-head"><h1>我的收藏</h1><p>共 ${favorites.length} 篇</p></div>
    <div class="material-list" id="fav-list">
      ${favorites.length
        ? favorites
            .map(
              (m) => `<article class="material-card" data-id="${m.id}">
                <div class="mc-top">${(m.topics || []).map((k) => `<span class="mc-topic">${esc(topicLabel(k))}</span>`).join(' ')}</div>
                <h3 class="mc-title">${esc(m.title)}</h3>
                <div class="mc-foot"><span>${esc(m.source.split('·')[0])}</span><span>${esc(m.publish_date)}</span></div>
              </article>`
            )
            .join('')
        : emptyHtml('还没有收藏，去素材详情页点「收藏」吧。')}
    </div>`;
  bindMaterialCards($('#fav-list'));
}

// ---------- 详情 ----------
async function renderDetail(id) {
  setLoading();
  let data;
  try { data = await api(`/api/materials/${id}`); }
  catch { app().innerHTML = `<div class="empty">素材不存在。</div>`; return; }
  const m = data.material;

  let favorited = false;
  let favLoading = false;
  if (state.user) {
    try {
      const favs = (await api('/api/favorites')).favorites;
      favorited = favs.some((f) => f.id === m.id);
    } catch {}
  }

  const golden = (m.golden_sentences || [])
    .map((g) => `<li class="golden-item"><span>${esc(g)}</span></li>`)
    .join('');
  const angles = (m.writing_angles || []).map((a) => `<span class="tag">${esc(a)}</span>`).join('');
  const tags = (m.topics || []).map((k) => `<span class="tag">${esc(topicLabel(k))}</span>`).join('');

  const fullText = m.original_content || '';
  const preview = fullText.length > 300 ? fullText.slice(0, 300) : fullText;
  const paragraphs = (text) =>
    text
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => `<p>${esc(p)}</p>`)
      .join('');

  app().innerHTML = `
    <div class="detail">
      <div class="detail-back" id="back-btn">← 返回列表</div>
      <div class="detail-head">
        <h1 class="detail-title">${esc(m.title)}</h1>
        <div class="detail-meta">
          <span class="badge src">${esc(m.source.split('·')[0])}</span>
          ${m.column_name ? `<span class="badge">${esc(m.column_name)}</span>` : ''}
          <span>${esc(m.publish_date)}</span>
          ${tags}
          <button class="btn-mini ${favorited ? 'on' : ''}" id="fav-btn" style="margin-left:auto">
            ${favorited ? '★ 已收藏' : '☆ 收藏'}
          </button>
        </div>
        <div class="src-line">来源：${esc(m.source)} ｜ ${esc(m.source_url)}</div>
      </div>

      <section class="sec">
        <h3>核心观点</h3>
        <div class="core-view">${esc(m.core_view)}</div>
      </section>

      <section class="sec">
        <h3>好词好句 · 金句摘录</h3>
        <ul class="golden-list">${golden || '<li class="muted">（暂无）</li>'}</ul>
      </section>

      <section class="sec">
        <h3>论证结构 / 框架</h3>
        <div class="structure">${esc(m.argument_structure)}</div>
      </section>

      <section class="sec">
        <h3>申论写作角度</h3>
        <div class="angle-list">${angles || '<span class="muted">（暂无）</span>'}</div>
      </section>

      <section class="sec">
        <h3>原文摘要</h3>
        <p>${esc(m.summary)}</p>
      </section>

      <section class="sec">
        <h3>原文全文</h3>
        <div class="original" id="original">
          <div class="original-head">
            <b>原文全文</b>
            <span class="muted" style="font-size:12px">共 ${fullText.length} 字</span>
          </div>
          <div class="original-body" id="original-body">${paragraphs(preview)}<div class="original-fade"></div></div>
          <div class="original-toggle">
            <button class="btn-ghost" id="expand-btn">展开阅读全文 ↓</button>
          </div>
        </div>
      </section>
    </div>
  `;

  $('#back-btn').onclick = () => (history.length > 1 ? history.back() : (location.hash = '#/'));

  $('#fav-btn').onclick = async () => {
    if (!state.user) {
      toast('请先登录后再收藏');
      openAuthModal('login');
      return;
    }
    if (favLoading) return;
    favLoading = true;
    try {
      const nowFav = !favorited;
      await api(`/api/favorites/${m.id}`, { method: nowFav ? 'POST' : 'DELETE' });
      favorited = nowFav;
      const btn = $('#fav-btn');
      btn.textContent = favorited ? '★ 已收藏' : '☆ 收藏';
      btn.classList.toggle('on', favorited);
      toast(favorited ? '已加入收藏' : '已取消收藏');
    } catch (e) {
      toast(e.message);
    } finally {
      favLoading = false;
    }
  };

  // 全文展开 / 收起
  const body = $('#original-body');
  const expandBtn = $('#expand-btn');
  const shortHtml = paragraphs(preview) + '<div class="original-fade"></div>';
  const fullHtml = paragraphs(fullText);
  let expanded = false;
  expandBtn.onclick = () => {
    expanded = !expanded;
    if (expanded) {
      body.innerHTML = fullHtml;
      body.classList.add('expanded');
      expandBtn.textContent = '收起 ↑';
    } else {
      body.innerHTML = shortHtml;
      body.classList.remove('expanded');
      expandBtn.textContent = '展开阅读全文 ↓';
    }
  };
}

function emptyHtml(msg = '暂无数据。') {
  return `<div class="empty">${esc(msg)}</div>`;
}

function renderNotFound() {
  app().innerHTML = `<div class="empty">页面不存在，<a href="#/">返回首页</a></div>`;
}

// ---------- 登录/注册弹窗 ----------
let authMode = 'login';

function openAuthModal(mode) {
  authMode = mode;
  const mask = $('#auth-modal');
  mask.hidden = false;
  updateAuthModal();
  $('#auth-username').focus();
}

function updateAuthModal() {
  const isLogin = authMode === 'login';
  $('#auth-modal-title').textContent = isLogin ? '登录' : '注册';
  $('#auth-modal-sub').textContent = isLogin ? '登录后可收藏重点素材' : '创建一个本地账号即可收藏素材';
  $('#auth-submit').textContent = isLogin ? '登录' : '注册';
  $('#auth-switch-link').textContent = isLogin ? '没有账号？注册一个' : '已有账号？去登录';
  $('#auth-error').textContent = '';
}

function bindAuthModal() {
  $('#modal-close').onclick = () => ($('#auth-modal').hidden = true);
  $('#auth-modal').addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') $('#auth-modal').hidden = true;
  });
  $('#auth-switch-link').onclick = (e) => {
    e.preventDefault();
    authMode = authMode === 'login' ? 'register' : 'login';
    updateAuthModal();
  };
  $('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const username = $('#auth-username').value.trim();
    const password = $('#auth-password').value;
    $('#auth-error').textContent = '';
    try {
      if (authMode === 'register') {
        await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
        authMode = 'login';
        updateAuthModal();
        toast('注册成功，请登录');
        return;
      }
      const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      state.user = res.user;
      renderAuthArea();
      $('#auth-modal').hidden = true;
      toast('登录成功');
      route();
    } catch (err) {
      $('#auth-error').textContent = err.message;
    }
  };
}

init();
bindAuthModal();
