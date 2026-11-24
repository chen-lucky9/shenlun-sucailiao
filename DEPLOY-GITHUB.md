# 方案 B：GitHub Actions + GitHub Pages 全自动更新

目标：每天 **07:30（北京时间）** 由 GitHub 云端自动抓取、整理、重建并发布，手机 PWA 自动更新，**完全不依赖你的电脑**。

---

## 一、准备

- 一个 GitHub 账号；
- 仓库建议设为 **Public**：GitHub Free 的 Pages 只对公开仓库开放。

> ⚠️ 版权提示：素材包含新闻评论 / 讲话全文。公开仓库与 Pages 站点意味着这些内容对外可见，仅供个人学习研究使用，请自行评估版权风险。
> 若希望私有，可使用 GitHub Pro 的私有 Pages，或改用 Netlify / Cloudflare Pages 的私有部署。

---

## 二、创建仓库并推送

1. 在 GitHub 新建仓库（例如 `shenlun-sucailiao`），**不要**勾选初始化 README；
2. 在本机项目目录执行（项目已完成首次提交，只需加远端并推送）：

```bash
cd "E:\文档\deepseek-harness\default-workspace\shenlun-sucailiao"
git remote add origin https://github.com/<你的用户名>/shenlun-sucailiao.git
git push -u origin main
```

---

## 三、开启 Pages

1. 仓库 → **Settings → Pages**；
2. Build and deployment → Source 选择 **GitHub Actions**；
3. 保存。

---

## 四、首次运行

1. 仓库 → **Actions** → 左侧 `daily-update` → **Run workflow**；
2. 等待 1–3 分钟；
3. `deploy` 任务成功后，站点地址为：

```
https://<你的用户名>.github.io/<仓库名>/
```

---

## 五、启用 DeepSeek AI 整理（可选，推荐）

默认使用规则化整理。配置 API Key 后，新入库素材会由 **DeepSeek** 按 11 维度整理，并在详情页标记「DeepSeek 整理」。

1. 到 https://platform.deepseek.com 申请 API Key；
2. 仓库 → **Settings → Secrets and variables → Actions → New repository secret**；
3. 名称填 `DEEPSEEK_API_KEY`，值填你的 Key；
4. 重新运行 `daily-update` 工作流。

本地使用：

```powershell
$env:DEEPSEEK_API_KEY="sk-..."
npm run daily               # 新素材由 DeepSeek 整理
npm run reorganize:llm      # 把已有素材也全部重新整理（会消耗 token）
```

> 未配置 Key 时会自动回退规则整理，不会报错、不会中断。

### 选择模型（可选）

默认使用 `deepseek-flash`。想换模型：

1. 仓库 → **Settings → Secrets and variables → Actions → Variables** 标签；
2. **New repository variable**：Name 填 `DEEPSEEK_MODEL`，Value 填模型名；
3. 重新运行 `daily-update` 工作流。

可选的模型：

| 模型 | 说明 |
| --- | --- |
| `deepseek-flash` | 官方快速模型，**当前可用**（结构化抽取 + JSON） |
| `deepseek-v4-pro` | V4 更强模型，质量更高、费用更高，可按需切换 |

> 运行后可在 `update` 任务日志里看到 `[llm] model=...`，即实际调用的模型。

---

## 六、手机安装

- **Android Chrome**：打开站点 → 菜单 →「安装应用 / 添加到主屏幕」；
- **iOS Safari**：打开站点 → 分享 →「添加到主屏幕」。

之后每天 07:30（北京时间）工作流会自动：

```
抓取最新评论 → 更新数据库 → 重建 dist/ → 提交数据库与日报 → 发布 GitHub Pages
```

手机 PWA 下次打开即为新数据（Service Worker 会更新缓存）。

---

## 六、手动触发与排错

- **手动更新**：Actions → `daily-update` → Run workflow；
- **查看日志**：Actions → 某次运行 → `update` 任务；
- **抓取失败**：GitHub 服务器在境外，个别来源可能访问受限；工作流仍会发布现有数据，不会中断；
- **Pages 404**：确认 Settings → Pages 的 Source 是 GitHub Actions，且 `deploy` 任务成功；
- **推送被拒**：确认仓库默认分支是 `main`（或把 `.github/workflows/daily-update.yml` 里的 `github.ref_name` 保持不变，它会自动适配）。

---

## 七、说明

- `data/materials.db` 会随每日运行自动提交，历史素材持续累积；
- `dist/` 在仓库中是**初始快照**；Pages 每次发布的是工作流现场重建的最新版本；
- 首次运行会补抓最近几天的文章，之后每天增量更新。
