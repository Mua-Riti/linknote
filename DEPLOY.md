# LinkNote · Vercel 部署指南

> 本文档涵盖从零到一的 Vercel 部署流程，支持自动化 CI/CD。

---

## 📋 前置条件

- [Node.js](https://nodejs.org/) ≥ 18.x
- [Git](https://git-scm.com/) 已安装
- [Vercel 账号](https://vercel.com/signup)（推荐用 GitHub 注册）
- 项目已通过 `npm run build` 构建成功

---

## 🚀 方式一：Vercel CLI 部署（推荐）

### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

浏览器将自动打开，完成授权后回到终端。

### 3. 首次部署（预览环境）

在项目根目录执行：

```bash
cd linknote
vercel
```

CLI 将引导你完成配置，所有问题直接回车使用默认值即可：

| 问题 | 回答 |
|------|------|
| Set up and deploy? | `Y` |
| Which scope? | 选择你的账号 |
| Link to existing project? | `N` |
| Project name | `linknote`（或自定义）|
| In which directory is your code? | `./` |
| Auto-detect framework? | 自动识别为 Vite |
| Override settings? | `N`（vercel.json 已配置好） |

### 4. 生产部署

预览确认无误后，发布到生产环境：

```bash
vercel --prod
```

部署完成后会返回生产 URL：`https://linknote-xxxxx.vercel.app`

---

## 🔗 方式二：GitHub 自动部署（极速 CI/CD）

每次 `git push` 到主分支时，Vercel 自动构建并部署。

### 1. 初始化 Git 仓库

```bash
cd linknote
git init
git add .
git commit -m "feat: LinkNote 初始化"
```

### 2. 推送到 GitHub

```bash
# 在 GitHub 先创建仓库 linknote，然后：
git remote add origin https://github.com/<你的用户名>/linknote.git
git branch -M main
git push -u origin main
```

### 3. 在 Vercel 导入项目

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New → Project**
3. 选择刚刚推送的 `linknote` 仓库
4. Vercel 自动识别 Vite 框架，配置已从 `vercel.json` 读取：
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 点击 **Deploy**

### 4. 自动部署已生效

此后每次 `git push main`，Vercel 自动触发构建：

```bash
git add .
git commit -m "feat: 新功能"
git push origin main
# → Vercel 自动构建 → 自动部署到生产环境 ✅
```

> PR（Pull Request）也会自动创建预览部署，方便 Code Review。

---

## 🧪 预览环境

Vercel 为每个分支/PR 自动生成独立预览 URL：

| 触发方式 | URL 格式 |
|----------|----------|
| 分支 `feat/xxx` | `https://linknote-git-feat-xxx-<用户名>.vercel.app` |
| Pull Request | PR 底部自动出现 Vercel Bot 评论，带预览链接 |

---

## 🌐 自定义域名

### 1. 在 Vercel 中添加域名

Dashboard → 项目 → Settings → Domains → 输入你的域名。

### 2. 配置 DNS

在域名服务商处添加记录：

| 类型 | 名称 | 值 |
|------|------|-----|
| CNAME | `@`（或 `www`）| `cname.vercel-dns.com` |

推荐使用 `A` 记录直接指向 Vercel 边缘网络 IP `76.76.21.21`。

### 3. 等待 SSL

Vercel 自动申请和续签 Let's Encrypt SSL 证书，无需手动操作。

---

## 📁 项目文件确认清单

部署前确认以下文件已提交：

```
linknote/
├── vercel.json          ✅ Vercel 配置（SPA 路由回退）
├── package.json         ✅ 依赖 + 构建脚本
├── tsconfig.json        ✅ TypeScript 配置
├── vite.config.ts       ✅ Vite 构建配置
├── tailwind.config.js   ✅ Tailwind CSS 配置
├── postcss.config.js    ✅ PostCSS 配置
├── index.html           ✅ 入口 HTML
└── src/                 ✅ 所有源代码
```

> ⚠️ `.gitignore` 应排除 `node_modules/`、`dist/`

---

## 🔧 环境变量（可选）

如果后续需要环境变量（如 API 地址），在 Vercel Dashboard 配置：

1. Settings → Environment Variables
2. 添加键值对，例如：
   - `VITE_APP_TITLE` = `LinkNote`
3. 重新部署生效

代码中通过 `import.meta.env.VITE_APP_TITLE` 访问。

---

## 📊 性能监控

部署后 Vercel 自动提供：

- **Web Vitals**：LCP / FID / CLS 等指标
- **Analytics**：访问量、来源分布（Settings → Analytics 中开启）
- **Logs**：Deployments → 点击具体部署 → View Logs

---

## ❗ 常见问题

### 404 刷新错误

**症状**：在非根路径刷新页面返回 404。

**解决**：`vercel.json` 已配置 `rewrites` 将所有路由回退到 `index.html`，SPA 路由正常工作。

### 构建失败

**检查清单**：

```bash
# 本地验证
npm run build          # 确保构建成功
npx tsc --noEmit       # 确保 TS 类型无错
```

### 静态资源 404

**症状**：CSS/JS 文件加载失败。

**解决**：检查 `vite.config.ts` 中的 `base` 配置，默认 `'/'` 即可。

```ts
// vite.config.ts
export default defineConfig({
  base: '/',  // Vercel 部署标准配置
  // ...
});
```

---

## 🎯 一键部署脚本

将以下内容保存为 `deploy.sh`（Windows 用 `deploy.ps1`）：

**macOS / Linux (`deploy.sh`)**：

```bash
#!/bin/bash
set -e
echo "🔨 构建中..."
npm run build
echo "📦 部署到 Vercel..."
vercel --prod
echo "✅ 部署完成！"
```

**Windows PowerShell (`deploy.ps1`)**：

```powershell
$ErrorActionPreference = "Stop"
Write-Output "🔨 Building..."
npm run build
Write-Output "📦 Deploying to Vercel..."
vercel --prod
Write-Output "✅ Deploy complete!"
```

---

## 📎 快速参考

| 命令 | 用途 |
|------|------|
| `vercel` | 预览部署 |
| `vercel --prod` | 生产部署 |
| `vercel logs <url>` | 查看日志 |
| `vercel env add` | 添加环境变量 |
| `vercel domain add` | 添加自定义域名 |
| `vercel ls` | 列出所有部署 |

---

> 部署完成后，LinkNote 即上线为纯静态 SPA，所有数据存于浏览器 IndexedDB，无需后端服务器。
