// HTTP 服务器：纯 Node 内置模块实现（node:http），零外部依赖
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  db, listTopics, listMaterials, getMaterial, archiveByMonth, stats,
  addMistake, listMistakes, updateMistake, deleteMistake, mistakeStats,
  PUBLIC_DIR, ROOT,
} from './db.js';
import { analyzeImage, visionEnabled, visionModel } from './vision.js';
import { chatWithModel, chatEnabled } from './ai-chat.js';
import { classifyQuestion } from './classifier.js';
import { reviewPrompt } from './prompts.js';
import { loadHuasheng13, hasHuasheng13, listSkillModules, getSkillContent } from './skill-library.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
// 默认监听所有网卡，手机/平板可通过同一局域网访问；可用 HOST=127.0.0.1 仅限本机
const HOST = process.env.HOST || '0.0.0.0';

// ---------- 会话（内存版，重启后需重新登录）----------
const sessions = new Map(); // token -> { userId, username }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function currentUser(req) {
  const token = parseCookies(req).session;
  if (!token) return null;
  return sessions.get(token) || null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) { reject(new Error('请求体过大')); req.destroy(); return; }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data.replace(/^\uFEFF/, ''))); }
      catch { reject(new Error('无效的 JSON 请求体')); }
    });
    req.on('error', reject);
  });
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// 控制复盘对话的上下文长度，避免 token 随轮次膨胀
const MAX_HISTORY_CHARS = Number(process.env.MAX_HISTORY_CHARS || 12000);
function trimHistory(history) {
  if (!Array.isArray(history)) return [];
  const out = [];
  let chars = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const c = m.content;
    if (out.length > 0 && chars + c.length > MAX_HISTORY_CHARS) break;
    out.unshift({ role: m.role, content: c });
    chars += c.length;
  }
  return out;
}

// ---------- 静态文件 ----------
function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, urlPath);
  // 防目录穿越
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

// ---------- API 路由 ----------
async function handleApi(req, res, url) {
  const { pathname } = url;
  const method = req.method;

  // 主题（后端动态获取）
  if (method === 'GET' && pathname === '/api/topics') {
    return sendJson(res, 200, { topics: listTopics() });
  }

  // 统计
  if (method === 'GET' && pathname === '/api/stats') {
    return sendJson(res, 200, stats());
  }

  // 归档
  if (method === 'GET' && pathname === '/api/archive') {
    return sendJson(res, 200, { months: archiveByMonth() });
  }

  // 素材列表 / 检索
  if (method === 'GET' && pathname === '/api/materials') {
    const topic = url.searchParams.get('topic') || '';
    const month = url.searchParams.get('month') || '';
    const q = (url.searchParams.get('q') || '').trim();
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)));
    return sendJson(res, 200, listMaterials({ topic, month, q, page, limit }));
  }

  // 素材详情
  const detailMatch = pathname.match(/^\/api\/materials\/(\d+)$/);
  if (method === 'GET' && detailMatch) {
    const item = getMaterial(Number(detailMatch[1]));
    if (!item) return sendJson(res, 404, { error: '素材不存在' });
    return sendJson(res, 200, { material: item });
  }

  // 注册 / 登录 / 登出 / 当前用户
  if (method === 'POST' && pathname === '/api/auth/register') {
    const { username, password } = await readBody(req);
    if (!username || !password) return sendJson(res, 400, { error: '用户名和密码不能为空' });
    if (String(username).length < 2 || String(password).length < 4) {
      return sendJson(res, 400, { error: '用户名至少2位、密码至少4位' });
    }
    const exists = db.prepare(`SELECT id FROM users WHERE username = ?`).get(String(username));
    if (exists) return sendJson(res, 409, { error: '用户名已存在' });
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(String(password), salt);
    db.prepare(`INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)`).run(String(username), hash, salt);
    return sendJson(res, 201, { ok: true, message: '注册成功，请登录' });
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const { username, password } = await readBody(req);
    if (!username || !password) return sendJson(res, 400, { error: '用户名和密码不能为空' });
    const user = db.prepare(`SELECT id, username, password_hash, salt FROM users WHERE username = ?`).get(String(username));
    if (!user) return sendJson(res, 401, { error: '用户名或密码错误' });
    const hash = hashPassword(String(password), user.salt);
    if (hash !== user.password_hash) return sendJson(res, 401, { error: '用户名或密码错误' });
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { userId: user.id, username: user.username });
    res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return sendJson(res, 200, { ok: true, user: { id: user.id, username: user.username } });
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    const token = parseCookies(req).session;
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const user = currentUser(req);
    return sendJson(res, 200, { user });
  }

  // 收藏
  if (method === 'GET' && pathname === '/api/favorites') {
    const user = currentUser(req);
    if (!user) return sendJson(res, 401, { error: '请先登录' });
    const rows = db
      .prepare(
        `SELECT m.id, m.title, m.publish_date, m.source, m.topics, m.column_name
         FROM favorites f JOIN materials m ON m.id = f.material_id
         WHERE f.user_id = ? ORDER BY f.created_at DESC`
      )
      .all(user.userId);
    return sendJson(res, 200, {
      favorites: rows.map((r) => ({ ...r, topics: JSON.parse(r.topics || '[]') })),
    });
  }

  const favMatch = pathname.match(/^\/api\/favorites\/(\d+)$/);
  if (favMatch && (method === 'POST' || method === 'DELETE')) {
    const user = currentUser(req);
    if (!user) return sendJson(res, 401, { error: '请先登录' });
    const materialId = Number(favMatch[1]);
    const exists = db.prepare(`SELECT id FROM materials WHERE id = ?`).get(materialId);
    if (!exists) return sendJson(res, 404, { error: '素材不存在' });
    if (method === 'POST') {
      db.prepare(`INSERT OR IGNORE INTO favorites (user_id, material_id) VALUES (?, ?)`).run(user.userId, materialId);
      return sendJson(res, 200, { ok: true, favorited: true });
    } else {
      db.prepare(`DELETE FROM favorites WHERE user_id = ? AND material_id = ?`).run(user.userId, materialId);
      return sendJson(res, 200, { ok: true, favorited: false });
    }
  }

  // 手动触发每日更新
  if (method === 'POST' && pathname === '/api/admin/update') {
    try {
      const { runDailyUpdate } = await import('./daily.js');
      const result = await runDailyUpdate({ manual: true });
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, 500, { error: '更新任务执行失败：' + e.message });
    }
  }

  // 图片识别（多模态）信息
  if (method === 'GET' && pathname === '/api/ai/vision/info') {
    return sendJson(res, 200, { enabled: visionEnabled(), model: visionModel() });
  }

  // 图片识别（多模态）：body = { image: base64, mime, prompt }
  if (method === 'POST' && pathname === '/api/ai/vision') {
    if (!visionEnabled()) return sendJson(res, 503, { error: '未配置 VISION_API_KEY / DEEPSEEK_API_KEY' });
    const { image, mime, prompt } = await readBody(req);
    if (!image) return sendJson(res, 400, { error: '缺少图片数据 image(base64)' });
    try {
      const r = await analyzeImage({ base64: String(image), mime: mime || 'image/jpeg', prompt });
      return sendJson(res, 200, { ok: true, text: r.text, model: r.model, finishReason: r.finishReason });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 行测单题复盘（文本对话）：body = { question, history }
  if (method === 'POST' && pathname === '/api/ai/review') {
    if (!chatEnabled()) return sendJson(res, 503, { error: '未配置 DEEPSEEK_API_KEY' });
    const { question, history } = await readBody(req);
    if (!question) return sendJson(res, 400, { error: '缺少题目文字' });
    const sys = reviewPrompt();
    const msgs = [
      { role: 'system', content: sys },
      { role: 'user', content: '我的题目：\n' + String(question) },
      ...trimHistory(history),
    ];
    try {
      const r = await chatWithModel({ messages: msgs, temperature: 0.6, maxTokens: 6000 });
      return sendJson(res, 200, { ok: true, reply: r.text, model: r.model });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 行测题型分类
  if (method === 'POST' && pathname === '/api/ai/classify') {
    if (!chatEnabled()) return sendJson(res, 503, { error: '未配置 DEEPSEEK_API_KEY' });
    const { question } = await readBody(req);
    if (!question) return sendJson(res, 400, { error: '缺少题目文字' });
    try {
      const r = await classifyQuestion(String(question));
      return sendJson(res, 200, { ok: true, ...r });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 错题本统计
  if (method === 'GET' && pathname === '/api/mistakes/stats') {
    return sendJson(res, 200, mistakeStats());
  }

  // 错题本列表
  if (method === 'GET' && pathname === '/api/mistakes') {
    const module = url.searchParams.get('module') || '';
    const question_type = url.searchParams.get('type') || '';
    const error_type = url.searchParams.get('error') || '';
    const mastery = url.searchParams.get('mastery') || '';
    const q = url.searchParams.get('q') || '';
    const favorite = url.searchParams.get('favorite') || '';
    const sort = url.searchParams.get('sort') || '';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
    return sendJson(res, 200, listMistakes({ module, question_type, error_type, mastery, q, favorite, sort, from, to, limit, offset }));
  }

  // 添加错题
  if (method === 'POST' && pathname === '/api/mistakes') {
    const d = await readBody(req);
    if (!d || !d.question_text) return sendJson(res, 400, { error: '缺少题目文字' });
    return sendJson(res, 201, { ok: true, ...addMistake(d) });
  }

  // 更新 / 删除错题
  const mistakeMatch = pathname.match(/^\/api\/mistakes\/(\d+)$/);
  if (mistakeMatch && (method === 'PATCH' || method === 'DELETE')) {
    const id = Number(mistakeMatch[1]);
    if (method === 'DELETE') return sendJson(res, 200, { ok: true, ...deleteMistake(id) });
    const d = await readBody(req);
    return sendJson(res, 200, { ok: true, ...updateMistake(id, d) });
  }

  // 花生十三方法库：模块列表
  if (method === 'GET' && pathname === '/api/skills/huasheng13') {
    return sendJson(res, 200, { has: hasHuasheng13(), modules: listSkillModules() });
  }

  // 花生十三方法库：某模块内容
  const skillMatch = pathname.match(/^\/api\/skills\/huasheng13\/(.+)$/);
  if (method === 'GET' && skillMatch) {
    const name = decodeURIComponent(skillMatch[1]);
    const content = getSkillContent(name);
    if (!content) return sendJson(res, 404, { error: '未找到该模块' });
    return sendJson(res, 200, { module: name, content });
  }

  // 花生十三方法库问答
  if (method === 'POST' && pathname === '/api/ai/skill') {
    if (!chatEnabled()) return sendJson(res, 503, { error: '未配置 DEEPSEEK_API_KEY' });
    const { question, module } = await readBody(req);
    if (!question) return sendJson(res, 400, { error: '缺少问题' });
    const lib = loadHuasheng13(module || '资料分析');
    const sys = `你是花生十三考公方法库助手。下面是方法库资料：\n${lib}\n\n请基于资料回答用户问题；资料没有覆盖的内容要明确说明，不要编造。用简洁的 Markdown 回答。`;
    try {
      const r = await chatWithModel({ messages: [{ role: 'system', content: sys }, { role: 'user', content: String(question) }], temperature: 0.3, maxTokens: 2000 });
      return sendJson(res, 200, { ok: true, reply: r.text, model: r.model });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 花生十三风格解题
  if (method === 'POST' && pathname === '/api/ai/solve') {
    if (!chatEnabled()) return sendJson(res, 503, { error: '未配置 DEEPSEEK_API_KEY' });
    const { question, module, options } = await readBody(req);
    if (!question) return sendJson(res, 400, { error: '缺少题目文字' });
    const lib = loadHuasheng13(module || '资料分析');
    const sys = `你是花生十三风格的考公行测解题教练。方法库：\n${lib}\n\n请严格模仿花生十三的解题思路，输出 Markdown：\n## 题型识别\n## 解题思路\n## 计算/推理过程\n## 答案\n## 易错点\n## 速算/秒杀技巧（如适用）\n不要编造题目没有的条件；不确定的地方明确说明。`;
    try {
      const r = await chatWithModel({
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: String(question) + (options ? '\n选项：' + options : '') },
        ],
        temperature: 0.3,
        maxTokens: 3000,
      });
      return sendJson(res, 200, { ok: true, reply: r.text, model: r.model });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  return sendJson(res, 404, { error: '接口不存在' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      return await handleApi(req, res, url);
    }
    return serveStatic(req, res);
  } catch (e) {
    console.error('[server]', e);
    if (!res.headersSent) sendJson(res, 500, { error: '服务器内部错误' });
  }
});

// 列出可供手机访问的局域网 IPv4 地址
function lanIPv4() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal && !/^(127\.|169\.254\.)/.test(a.address)) {
        out.push({ name, address: a.address });
      }
    }
  }
  return out;
}

server.listen(PORT, HOST, () => {
  console.log('申论素材库已启动');
  console.log(`  本机访问： http://127.0.0.1:${PORT}`);
  const lan = lanIPv4();
  for (const { name, address } of lan) {
    console.log(`  手机访问（同一 Wi-Fi）： http://${address}:${PORT}    [${name}]`);
  }
  if (!lan.length) console.log('  未检测到局域网地址，请确认已连接 Wi-Fi 或网线。');
  if (HOST !== '0.0.0.0') console.log(`  注意：当前仅监听 ${HOST}，手机无法访问；请设置 HOST=0.0.0.0。`);
  console.log(`  提示：手机与本机需在同一局域网；若打不开，请放行系统防火墙 TCP 端口 ${PORT}。`);
});

// 启动内置每日 7:30 定时任务（失败不影响主服务）
import('./daily.js')
  .then((m) => m.startScheduler())
  .catch((e) => console.warn('[scheduler] 未启用每日任务：', e.message));

export { server };
