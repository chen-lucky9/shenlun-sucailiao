# 申论素材库

面向公务员考试申论备考的**素材积累与检索应用**。聚合人民日报、求是网、共产党员网等权威来源的评论文章与领导人重要讲话，按 8 大申论主题分类整理，支持检索、收藏、历史归档与每日自动更新。

> 技术栈：纯 Node.js（内置 `node:http` + `node:sqlite` + `node:crypto`）+ 原生前端，**零第三方依赖**，开箱即用。

---

## 快速开始

```bash
# 1. 启动服务（默认 http://127.0.0.1:3000）
npm start
# 或
node src/server.js

# 2. 浏览器打开
#    http://127.0.0.1:3000
```

数据库已预置 **116 篇**真实素材（`data/materials.db`），无需额外操作即可浏览、检索、收藏。

其他常用命令：

```bash
npm run seed       # 从 data/articles.json 重新导入素材（按 URL 幂等 upsert）
npm run validate   # 校验硬性分布约束（基于 articles.json）
node scripts/validate-db.js   # 校验应用实际数据库中的全部约束
npm run daily      # 立即执行一次每日抓取整理（也可在页面/接口触发）
```

> 若系统 `node` 不在 PATH，可使用随环境提供的路径：
> `C:\Users\chenyiyuan\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe src/server.js`

---

## 手机访问（同一 Wi-Fi）

1. 让手机与本机连接**同一个 Wi-Fi / 局域网**；
2. 启动服务后，终端会打印可用的“手机访问”地址，例如：
   ```
   手机访问（同一 Wi-Fi）： http://10.0.197.70:3000    [WLAN]
   ```
3. 手机浏览器直接打开该地址即可。界面已适配手机：底部导航（首页 / 归档 / 搜索 / 收藏）、竖屏阅读、金句高亮与全文折叠。

说明：

- 服务默认监听 `0.0.0.0:3000`；若只想本机访问，启动时设置 `HOST=127.0.0.1`。
- **打不开时**：① 确认手机和电脑在同一网络；② 放行防火墙 TCP 3000（管理员 PowerShell 执行 `scripts/allow-firewall.ps1`，或运行
  `netsh advfirewall firewall add rule name="Shenlun-3000" dir=in action=allow protocol=TCP localport=3000`）；
  ③ 公司/校园网常做设备隔离，手机可能无法直连电脑，可换用手机热点（电脑连手机热点，再用热点网段 IP 访问）。
- 本机 Wi-Fi 的 IPv4 地址可用 `ipconfig` 查看（看“WLAN”适配器）。

---

## 外网访问（手机不在同一 Wi-Fi 也能用）

校园网/公司网常有**设备隔离**，手机与电脑即使连同一个 Wi-Fi 也互相访问不到（表现为打不开 `http://10.x.x.x:3000`）。用 Cloudflare 快速隧道绕开：

1. 安装（本机已装）：`winget install Cloudflare.cloudflared`
2. 双击 `scripts\start-tunnel.cmd`（或运行 `cloudflared tunnel --url http://127.0.0.1:3000`）
3. 窗口里会显示形如 `https://xxxx.trycloudflare.com` 的地址，手机用 4G/5G 或任意 Wi-Fi 直接打开即可。
4. 因为是 HTTPS，手机可「添加到主屏幕」当 App 用。

注意：

- 快速隧道地址**每次重启都会变**，关掉窗口即断开，适合临时使用；
- 想要固定地址：用 Cloudflare 账号 + 域名做「命名隧道」，或把离线版部署到 GitHub Pages / Netlify；
- 公网可访问意味着知道你地址的人也能打开，建议仅个人使用。

---

## 做成手机 App（无需买服务器）

### 方案零：单文件离线版（最省事，零托管）

```bash
node scripts/build-singlefile.js
```

生成 `dist/shenlun-offline.html`（约 0.8 MB，单文件）。用微信 / 邮件 / AirDrop 发到手机，用浏览器打开即可阅读、检索、收藏——**不需要服务器，也不需要任何托管**。

> 说明：单文件在 `file://` 下不支持 Service Worker，部分浏览器对本地文件的 localStorage 也有限制（收藏可能不持久）。要稳定的「安装到桌面」体验，请用方案一。

### 方案一：离线 PWA（推荐，零成本）

`dist/` 是完全静态的离线版：116 篇素材已内置到 `data.js`，**不需要后端、不需要数据库，断网也能用**，收藏保存在本机 localStorage。

```bash
node scripts/build-static.js   # 数据有更新时重新生成 dist/
node scripts/serve-dist.js     # 本地预览 http://127.0.0.1:3001（也可用手机访问）
```

部署到任意**免费静态托管**即可（不用买服务器）：

- **Netlify Drop**：把 `dist` 文件夹拖到 https://app.netlify.com/drop ，立即得到公网地址；
- **GitHub Pages / Cloudflare Pages / Vercel**：上传 `dist` 目录。

手机上打开得到的公网地址后安装：

- **Android Chrome**：右上角菜单 →「安装应用 / 添加到主屏幕」；
- **iOS Safari**：分享按钮 →「添加到主屏幕」。

安装后是独立图标、全屏打开，断网也能用。

### 方案二：打包成 APK / iOS App

- **PWABuilder**（最简单，云端打包）：把上面的 PWA 网址填入 https://www.pwabuilder.com ，可直接下载 Android APK 或 iOS 工程；
- **Capacitor**（本地打包，需 Android Studio）：以 `dist` 为 web 目录打包，步骤见 [dist/README.md](shenlun-sucailiao/dist/README.md)。

### 需要买服务器吗？

- **个人自用：不需要。** 离线 PWA + 免费静态托管即可，0 成本。
- **需要服务器的情况**：① 每天自动抓取更新；② 多设备/多端同步数据与收藏；③ 不想每次手动重新部署。
  - 可选便宜 VPS（约几十元/月）或免费 PaaS（Render / Fly.io 等，注意休眠与额度）；
  - 折中做法：在电脑上定期执行「抓取 + `build-static.js`」，再重新上传 `dist`，即可“准自动更新”，仍然不需要服务器。

> 离线版是**数据快照**：新增素材后需重新构建并上传；在线版（`npm start`）才具备每日 07:30 自动更新能力。

---

## 全自动更新（无人值守）

已注册 Windows 计划任务 **`ShenlunDailyUpdate`**：

- **时间**：每天 **07:30**（错过会在电脑可用时尽快补跑）
- **动作**：`powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-daily.ps1`
- **流程**：抓取最新评论 → 整理入库（按 URL 去重）→ 生成 `data/daily/YYYY-MM-DD.md` → **自动重建 `dist/`（PWA + 单文件）**

管理命令：

```powershell
# 查看任务
schtasks /Query /TN "ShenlunDailyUpdate" /V /FO LIST

# 立即手动触发一次
Start-ScheduledTask -TaskName "ShenlunDailyUpdate"

# 查看运行日志
Get-Content data\daily-job.log -Tail 50
```

说明：

- 计划任务**独立于网页服务**：即使没有 `npm start`，到点也会执行；在电脑开机并登录的状态下工作。
- 网页服务内置的 07:30 定时器与计划任务可能同时触发，代码里已用 `data/.daily.lock` 锁避免重复执行。
- 离线 PWA 会自动重建；如果部署在静态托管，需要把新的 `dist/` 重新上传（或用 GitHub Actions 自动部署）。
- 电脑关机/休眠时任务不会执行，但 `StartWhenAvailable` 会在下次可用时补跑。

常用命令：

```bash
node scripts/build-static.js      # 手动重建离线 PWA
node scripts/build-singlefile.js  # 手动重建单文件 HTML
node scripts/serve-dist.js        # 本地预览 dist/
npm run daily                     # 立即执行一次每日更新（含重建）
```

### 手机端怎么拿到最新数据？

- **用在线版**（电脑 `npm start`，手机访问同一 Wi-Fi 或内网穿透地址）：数据实时来自数据库，计划任务更新后手机刷新即可看到，**无需手动操作**。
- **用离线 PWA / 单文件**：内置的是构建时的数据快照。计划任务会自动重建本机 `dist/`，但若你把 `dist/` 部署在静态托管上，需要重新上传新的 `dist/`。
- **想云端全自动（不依赖电脑）**：按 [DEPLOY-GITHUB.md](shenlun-sucailiao/DEPLOY-GITHUB.md) 操作——推到 GitHub、Pages 选 GitHub Actions，仓库自带的 [daily-update.yml](shenlun-sucailiao/.github/workflows/daily-update.yml) 会每天 07:30 自动抓取 → 重建 → 发布，手机 PWA 随站点自动更新。
  - 说明：该工作流需要 GitHub 仓库与 Actions 权限；抓取依赖来源站点可访问。

---

## 功能

| 模块 | 说明 |
| --- | --- |
| 首页 | 最新素材（按发布日期倒序）+ 8 大主题快速入口 + 数据统计 |
| 分类页 | 按 8 大主题筛选，主题**从后端动态获取**，前端按英文 key 筛选 |
| 历史归档 | 按月份查看全部历史素材（2025-01 至 2026-11 共 23 个月） |
| 关键词检索 | 在标题、摘要、金句、原文全文中搜索 |
| 收藏 | 注册/登录后可收藏重点素材（会话 Cookie + SQLite） |
| 详情页 | 完整展示 11 个维度；金句高亮；原文全文默认折叠（前 300 字 + 展开/收起） |
| 每日更新 | 内置每天 **07:30** 定时抓取 + 整理入库（去重），并生成当日 Markdown 整理文档 |

### 素材详情页的 11 个维度

1. 标题　2. 栏目/作者　3. 发布日期　4. 原文来源（**纯文本标注**网站与链接，不做可点击跳转）　5. 核心观点概括　6. 好词好句/金句（≥5 条）　7. 论证结构/框架　8. 申论主题标签（8 大英文 key）　9. 可用于申论的写作角度（≥3 个）　10. 原文摘要　11. 原文全文（`original_content`，>100 字）

---

## 8 大主题（英文 key，存于 `topics` 字段）

| key | 中文 | 覆盖方向 |
| --- | --- | --- |
| `law_enforcement` | 行政执法 | 民生服务、基层治理、行政执法、作风建设、党的建设 |
| `rural_revitalization` | 乡村振兴 | 农业农村、粮食安全、脱贫攻坚 |
| `business_environment` | 营商环境 | 民营经济、对外开放、统一大市场、消费升级 |
| `sci_tech_innovation` | 科技创新 | 创新生态、新质生产力、人才工作、教育强国 |
| `green_development` | 绿色发展 | 生态文明、生态治理、双碳、环境保护 |
| `industrial_upgrading` | 产业升级 | 经济发展、高质量发展、制造业、未来产业 |
| `digital_economy` | 数字经济 | 人工智能、数字中国、数字化转型 |
| `cultural_confidence` | 文化自信 | 文化建设、文化出海、非遗、文博、文旅、爱国主义 |

---

## 数据说明

- **规模**：数据库 116 篇；时间跨度 2025-01 ~ 2026-11，**每个自然月均 ≥3 篇**。
- **来源**：人民日报 96 篇（人民时评、评论员观察、现场评论、纵横、金台随笔、人民观点、微观等）、求是网 9 篇（《求是》杂志评论员等）、共产党员网 6 篇（先锋评论、基层党建、党员教育等）、重要讲话 5 篇（习近平在纪念孙中山诞辰160周年大会上的讲话、纪念红军长征胜利90周年大会上的讲话、APEC 工商领导人峰会主旨演讲、欢迎晚宴祝酒辞、携手共建亚太命运共同体）。
- **真实性**：全部素材均来自官方页面实际抓取，`source_url` 为原文真实地址，`publish_date` 取自原文/URL 的真实发布日期，`original_content` 为抓取到的正文全文（已去除导航、广告、版权声明等）。**未编造任何文章、标题、日期或 URL**。
- **整理方式**：`src/organizer.js` 基于原文进行规则化整理——金句为原文逐字摘录并按语义评分排序，核心观点/摘要取自原文首段与主题句，论证结构按原文行文特征（分层、辩证、递进、问题—对策等）识别，主题按关键词表 + 人工校准映射到 8 大英文 key。该模块可替换为 LLM 调用以进一步提升概括质量（见下）。
- **版权**：素材仅供个人学习研究使用，版权归原作者及原媒体所有；应用内来源以纯文本标注，不提供外链跳转。

### 每日定时更新

`src/daily.js` 内置调度器，每天 07:30 自动执行：

1. 抓取人民日报评论版（当日/就近日期）、求是网社论评论、共产党员网当日文章；
2. 按 11 维度整理，按 `source_url` 去重后入库；
3. 生成 `data/daily/YYYY-MM-DD.md` 当日整理文档；
4. 写入 `update_log` 表。

手动触发：`npm run daily`，或 `POST /api/admin/update`。

> **AI 整理（DeepSeek）**：配置 `DEEPSEEK_API_KEY` 后，新入库素材会由 DeepSeek（`src/llm-organizer.js`）按 11 维度整理，并在详情页标记「DeepSeek 整理」；未配置时自动回退规则整理（`src/organizer.js`），不会中断。模型默认 `deepseek-flash`，可用环境变量 `DEEPSEEK_MODEL` 覆盖（GitHub Actions 中存为仓库 Variable）。
> 可用 `npm run reorganize:llm` 把已有素材全部重新整理；GitHub Actions 中把 Key 存为仓库 Secret `DEEPSEEK_API_KEY` 即可。

---

## 目录结构

```
shenlun-sucailiao/
├── package.json
├── src/
│   ├── server.js      # HTTP 服务 + REST API + 静态资源
│   ├── db.js          # node:sqlite 建表、主题、查询
│   ├── collector.js   # 各来源抓取与正文抽取（人民日报/求是网/通用）
│   ├── organizer.js   # 11 维度规则化整理
│   ├── seed.js        # 种子导入
│   └── daily.js       # 每日 07:30 定时更新 + 当日文档
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js         # 哈希路由 SPA
├── data/
│   ├── materials.db   # SQLite 数据库（预置 116 篇）
│   ├── articles.json  # 素材快照（111 篇基线，可重新导入）
│   ├── raw/           # 抓取的原文 JSON
│   └── daily/         # 每日整理文档
└── scripts/
    ├── collect-all.js / collect-others.js  # 批量采集
    ├── organize.js                        # 生成 articles.json
    ├── validate.js / validate-db.js       # 约束校验
    └── smoke.js                           # 接口冒烟测试
```

---

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/topics` | 8 大主题（动态） |
| GET | `/api/stats` | 总数、最新日期、主题/来源/月份分布 |
| GET | `/api/materials` | 列表/筛选/检索（`topic`/`month`/`q`/`page`/`limit`） |
| GET | `/api/materials/:id` | 素材详情 |
| GET | `/api/archive` | 按月份归档 |
| POST | `/api/auth/register` / `/api/auth/login` / `/api/auth/logout` | 注册/登录/登出 |
| GET | `/api/favorites`｜POST/DELETE `/api/favorites/:id` | 收藏列表/增删 |
| POST | `/api/admin/update` | 手动执行每日更新 |

---

## 约束校验结果（数据库实际数据）

- 总篇数 116（≥70）✅
- 2025-01 ~ 2026-11 每月 ≥3 篇 ✅
- 8 大分类每类 ≥5 篇 ✅
- 近 3 个月（2026-09/10/11）每类 ≥2 篇 ✅
- 四来源均 ≥5 篇 ✅
- 最新日期 2026-11-24（当前月）✅
- 原文全文均 >100 字、URL 均有效 ✅
