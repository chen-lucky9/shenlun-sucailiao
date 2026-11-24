// 接口冒烟测试
const BASE = 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.log(`✗ ${name} ${extra}`); }
}

async function j(pathname, opts = {}) {
  const res = await fetch(BASE + pathname, opts);
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { res, body };
}

// 静态首页
{
  const res = await fetch(BASE + '/');
  const html = await res.text();
  ok('GET / 返回 HTML', res.status === 200 && html.includes('申论素材库'));
}

// 主题
{
  const { body } = await j('/api/topics');
  ok('主题动态获取 8 个', body.topics.length === 8, JSON.stringify(body.topics?.length));
  ok('主题为英文 key', body.topics.every((t) => /^[a-z_]+$/.test(t.key)));
}

// 统计
{
  const { body } = await j('/api/stats');
  ok('统计 total>=111', body.total >= 111, String(body.total));
  ok('统计 latest 为当月', (body.latest || '').startsWith('2026-11'), body.latest);
}

// 列表
{
  const { body } = await j('/api/materials?limit=5');
  ok('列表返回 5 条', body.items.length === 5, String(body.items.length));
  ok('列表按日期倒序', body.items[0].publish_date >= body.items[body.items.length - 1].publish_date);
}
// 主题筛选
{
  const { body } = await j('/api/materials?topic=rural_revitalization&limit=100');
  ok('乡村振兴筛选非空且全部含该 key', body.items.length >= 5 && body.items.every((m) => m.topics.includes('rural_revitalization')), String(body.items.length));
}
// 检索
{
  const { body } = await j('/api/materials?q=' + encodeURIComponent('粮食') + '&limit=100');
  ok('关键词检索命中', body.total > 0, String(body.total));
}
// 归档
{
  const { body } = await j('/api/archive');
  ok('归档 23 个月', body.months.length === 23, String(body.months.length));
}
// 详情
{
  const { body } = await j('/api/materials/1');
  const m = body.material;
  ok('详情 11 维度字段齐备', m && m.title && m.column_name && m.publish_date && m.source && m.source_url && m.core_view && m.golden_sentences.length >= 5 && m.argument_structure && m.topics.length && m.writing_angles.length >= 3 && m.summary && m.original_content.length > 100);
}
// 认证 + 收藏
{
  const uname = 'smoke_' + Date.now();
  let r = await j('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: uname, password: 'pass1234' }) });
  ok('注册成功', r.res.status === 201, JSON.stringify(r.body));
  r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: uname, password: 'pass1234' }) });
  const setCookie = r.headers.get('set-cookie');
  const body = await r.json();
  ok('登录成功并返回用户', r.status === 200 && body.user?.username === uname, JSON.stringify(body));
  const cookie = setCookie ? setCookie.split(';')[0] : '';
  // 收藏
  let f = await j('/api/favorites/1', { method: 'POST', headers: { cookie } });
  ok('收藏成功', f.body.favorited === true);
  f = await j('/api/favorites', { headers: { cookie } });
  ok('收藏列表含该篇', f.body.favorites.some((x) => x.id === 1));
  // 取消收藏
  f = await j('/api/favorites/1', { method: 'DELETE', headers: { cookie } });
  ok('取消收藏', f.body.favorited === false);
  // 未登录收藏应 401
  f = await j('/api/favorites/1', { method: 'POST' });
  ok('未登录收藏返回 401', f.res.status === 401);
}

console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);
