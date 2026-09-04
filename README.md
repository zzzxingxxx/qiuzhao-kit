# 秋招网申助手（qiuzhao-kit）

本机优先的秋招工具：简历主档、求职档案、校招页预填、投递看板。  
**预填不等于代投。提交按钮永远由你亲手点。**

## 要求

- Node.js 22+
- pnpm 10+
- Chrome / Edge（扩展从 M2 开始对任意网申页预填，提交仍手点）

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

## 简历模板

网页「简历」页有 **8 套完整校招一页纸**（教育、实习、项目、技能、校园、奖项、评价都已排好），按研发 / 正式 / 双栏 / 创意筛选。点选即套用完整示例。已填的姓名、手机、邮箱和教育会保留。

| 模板 | 适合 |
| --- | --- |
| 技术简洁 | 互联网研发，ATS 友好 |
| 正式经典 | 国企 / 银行，居中 + 证件照 |
| 左侧信息栏 | 综合岗双栏 |
| 顶栏色块 | 产品 / 运营 |
| 经历时间轴 | 实习项目多的研发 |
| 学术衬线 | 科研 / 高校 |
| 左右分栏 | 综合岗高密度 |
| 模块卡片 | 展示型 |

另支持主题色、字号/疏密、模块显隐与排序、证件照。点「导出 PDF」会升版本号，然后打开系统打印框，选择「另存为 PDF」。默认文件名形如 `张三-后端-v3`。

## AI 助手

本机服务代发 OpenAI 兼容请求，密钥只存在 `apps/server/data/app.db`，不进前端包、不进 Git。

1. 打开「设置」
2. 填写 Base URL 和 API Key（默认 SpaceXAI：`https://api.x.ai/v1`，模型 `grok-4.5`）
3. 点「拉取模型」，会请求 `{Base URL}/models`
4. 在简历页打开「AI 助手」：按模块润色、STAR、生成评价、按 JD 改写、诊断、自由提问

也可填本地接口，例如 Ollama：`http://127.0.0.1:11434/v1`。环境变量 `XAI_API_KEY` 可作备用密钥（见 `.env.example`）。

```bash
curl http://127.0.0.1:8787/ai/settings
```

档案 / 简历 CRUD：

```bash
curl http://127.0.0.1:8787/profiles
curl -X POST http://127.0.0.1:8787/profiles -H "Content-Type: application/json" -d "{\"name\":\"张三\"}"
curl http://127.0.0.1:8787/resumes
```

SQLite 文件：`apps/server/data/app.db`（不入库）。使用 Node 22 内置 `node:sqlite`，无需编译原生模块。

## 仓库

```
apps/web          工作台 / 档案 / 简历 / 看板 / 设置
apps/extension    预填扩展（M2 对任意网申页填表，目前只检查本机服务）
apps/server       本机 API，只听 127.0.0.1
packages/schema   Profile / Resume / Application / AI
packages/fill     抽表单骨架并写回输入框（M2，目前仅 ATS 名字备注）
packages/pdf      一页纸 A4 尺寸与导出文件名
docs/M2.md        M2 任意网申页 AI 预填
```

## 阶段

| 阶段 | 状态 |
| --- | --- |
| M0 W1 脚手架 + 数据契约 | 已完成 |
| M1a W2 档案表单 | 已完成 |
| M1b W3 一页 PDF | 已完成（8 套完整模板 + 主题/模块/证件照） |
| AI 助手（自定义 URL / Key / 拉模型 / 按模块改写） | 已完成 |
| M2 任意网申页 AI 预填 | 未开始，见 [docs/M2.md](docs/M2.md) |
| M3 投递看板闭环 | 未开始 |

## 明确不做

自动提交、自动过验证码、云端代投、导出 Cookie、Boss 海投当主功能。
