# 秋招网申助手（qiuzhao-kit）

本机优先的秋招工具：简历主档、求职档案、校招页预填、投递看板。  
**预填不等于代投。提交按钮永远由你亲手点。**

## 要求

- Node.js 22+
- pnpm 10+
- Chrome / Edge（扩展从 W4 开始真正填表）

## 启动

```bash
pnpm install
pnpm dev
```

或 Windows 双击 `start.bat`。

| 服务 | 地址 |
| --- | --- |
| 本机 API | http://127.0.0.1:8787/health |
| 网页 | http://127.0.0.1:5173 |
| 扩展 | `apps/extension` 用 `pnpm dev:ext`，再在浏览器加载 `.output/chrome-mv3` |

档案 / 简历 CRUD：

```bash
curl http://127.0.0.1:8787/profiles
curl -X POST http://127.0.0.1:8787/profiles -H "Content-Type: application/json" -d "{\"name\":\"张三\"}"
curl http://127.0.0.1:8787/resumes
```

网页「简历」页是校招一页纸编辑器：左侧改内容，右侧实时 A4 预览。支持主题色、字号/疏密、模块显隐与排序、技能分组、校园经历、证件照。点「导出 PDF」会升版本号，然后打开系统打印框，选择「另存为 PDF」（可选中复制的文字，不是截图像素）。默认文件名形如 `张三-后端-v3`。

SQLite 文件：`apps/server/data/app.db`（不入库）。使用 Node 22 内置 `node:sqlite`，无需编译原生模块。

## 仓库

```
apps/web          档案 / 简历 / 看板
apps/extension    预填扩展（W1 只检查本机服务）
apps/server       本机 API，只听 127.0.0.1
packages/schema   Profile / Resume / Application
packages/fill     站点探测（W4 补全）
packages/pdf      一页纸 A4 尺寸与导出文件名
```

## 阶段

| 阶段 | 状态 |
| --- | --- |
| M0 W1 脚手架 + 数据契约 | 已完成 |
| M1a W2 档案表单 | 已完成 |
| M1b W3 一页 PDF | 已完成（成熟校招纸样：主题/模块/证件照） |
| M2 北森预填 | 未开始 |
| M3 投递看板闭环 | 未开始 |

## 明确不做

自动提交、自动过验证码、云端代投、导出 Cookie、Boss 海投当主功能。
