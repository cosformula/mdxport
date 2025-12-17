# Repository Guidelines

## 项目结构与模块组织

- `src/routes/`：页面与布局（SvelteKit）。
  - `src/routes/+page.svelte`：语言选择与根路径跳转。
  - `src/routes/[lang]/+page.svelte`：主界面（左侧 Markdown 编辑，右侧 PDF 预览）。
- `src/lib/i18n/`：多语言与路由参数（如 `src/lib/i18n/lang.ts`）。
- `src/lib/pipeline/`：转换管线（Markdown AST → Typst 文本），核心：`src/lib/pipeline/markdownToTypst.ts`。
- `src/lib/typst/`：Typst 排版方案（模板化样式与正文解耦）。
  - `src/lib/typst/styles/modern-tech.typ`：现代科技风。
  - `src/lib/typst/styles/classic-editorial.typ`：经典阅读风。
- `src/lib/workers/`：WASM/CPU 重任务（Typst 编译）放在 Worker 内，避免阻塞 UI。
- `src/lib/pdf/`：PDF 预览基础封装（PDF.js + PDFViewer；避免浏览器内置预览侧边栏占位）。
- `docs/`：设计与计划（见 `docs/DESIGN.md`、`docs/ENG.md`、`docs/MVP_PLAN.md`）。

## 构建、测试与开发命令

- 安装依赖：`npm install`
- 本地开发：`npm run dev`（启动 Vite dev server）
- 类型检查：`npm run check`（Svelte + TS 类型检查）
- 生产构建：`npm run build`（静态站点产物在 `build/`）
- 预览构建：`npm run preview`（本地预览构建产物）

## 代码风格与命名约定

- 缩进：TypeScript/Svelte 统一 2 空格；避免混用 Tab（示例：`src/lib/pipeline/*`）。
- 命名：TS 函数/变量用 `camelCase`；文件按职责命名（如 `typstClient.ts`、`pdfjs.ts`）。
- 约束：保持“样式在 Typst 模板，正文仅内容”的模板化写法；避免在生成器里硬编码 `set/show`。排版优先改 `src/lib/typst/styles/*`，新增方案走 `MarkdownToTypstOptions.style`。
- 浏览器边界：页面代码用 `$app/environment` 的 `browser` 或 `onMount` 保护浏览器 API；Typst/WASM 初始化放在 `src/lib/workers/*`。

## 测试指南

当前未配置测试框架。新增测试建议以“导出回归”为目标：准备 `tests/fixtures/*.md` 作为 golden 文档集，断言 PDF 可生成且诊断为空（或可接受）。

## 提交与 Pull Request 规范

- Git 历史较少，建议从现在开始采用 **Conventional Commits**。示例：
  - `docs: 补充 prerender 约束说明`
  - `feat: 支持引用式链接与引用块`
  - `fix: 代码块包含 ``` 时避免 typst raw 报错`

PR 需包含：变更动机/影响范围、关联 Issue（如有）、用户可见行为说明；涉及 UI/排版时附截图（或导出 PDF 样例）。

## 排障提示

- Typst 报错通常会指向 `main.typ:行:列`：在页面左侧面板展开“生成的 Typst（用于排障）”，定位对应行并回溯到 Markdown 源文。
- 遇到代码块相关报错（如 `unclosed raw text`），优先检查 Markdown 中是否包含未配对的反引号围栏或复制粘贴导致的 fence 缺失。

## 架构约束（不可违反）

MDXport 目标是 **静态部署、纯客户端导出管线**：
- 禁止新增 SvelteKit 服务端能力（`+server.ts`、form actions）。
- 禁止在模块顶层访问浏览器 API；Worker/WASM 必须在客户端生命周期内初始化（如 `onMount`）。
- 默认离线；远程资源（图片/字体）必须显式 opt-in。
