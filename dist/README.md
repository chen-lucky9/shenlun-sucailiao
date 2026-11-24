# 申论素材库 · 离线 PWA 版

本目录是**完全静态**的应用：数据已内置于 `data.js`，不需要后端、不需要数据库、断网也能用。
收藏保存在浏览器 localStorage。

## 本地预览

```bash
# 任选其一（Service Worker 需要 http 环境，file:// 双击打开也能用，但不支持安装）
node scripts/serve-dist.js        # http://127.0.0.1:3001
# 或
python -m http.server 3001 --directory dist
```

## 免费部署（无需买服务器）

任选一个静态托管，把本目录整体上传即可：

- **Netlify Drop**：打开 https://app.netlify.com/drop ，把 `dist` 文件夹拖进去，立即得到公网地址；
- **GitHub Pages**：把本目录推到仓库，Settings → Pages 选择分支目录；
- **Cloudflare Pages / Vercel**：新建项目，上传本目录。

部署后得到形如 `https://xxx.netlify.app` 的地址。

## 安装到手机主屏幕

- **Android（Chrome）**：打开网址 → 右上角菜单 → 「安装应用 / 添加到主屏幕」；
- **iOS（Safari）**：打开网址 → 分享按钮 → 「添加到主屏幕」。

安装后图标会出现在桌面，打开即全屏，断网可用。

## 打包成 APK / iOS App

- **PWABuilder**（最简单，云端打包）：https://www.pwabuilder.com 输入你的 PWA 网址，可直接下载 Android APK / iOS 工程；
- **Capacitor**（本地打包，需 Android Studio）：
  ```bash
  npm init -y
  npm i @capacitor/core @capacitor/cli @capacitor/android
  npx cap init 申论素材库 com.example.shenlun --web-dir=dist
  npx cap add android
  npx cap sync
  # 用 Android Studio 打开 android/ 构建 APK
  ```

## 更新数据

素材库数据更新后，重新执行：

```bash
node scripts/build-static.js
node scripts/gen-icons.py      # 如首次构建，生成图标
```

然后重新上传 `dist` 目录即可（Service Worker 会自动更新缓存）。
