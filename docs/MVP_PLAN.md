# MDXport MVP 计划：Markdown → PDF

## 目标与范围

**目标**：在纯前端（静态部署）架构下，实现“输入 Markdown → 生成 PDF 预览 → 下载 PDF”。  
**约束**（来自 `docs/ENG.md`）：全站静态 prerender；禁止 `+server.ts` 与 form actions；Typst/WASM 必须在浏览器运行时初始化（建议放在 Worker）。

**MVP 支持的 Markdown 子集**（先跑通链路）：
- 标题（H1~H3）、段落、粗体/斜体、行内代码、代码块、无序/有序列表、链接
- 不支持/先降级：表格、图片、复杂嵌套结构、内嵌 HTML（后续再做 Profile + Preflight）

## 技术路线（与设计对齐）

1) **Markdown → AST**：使用解析库产出结构化 AST（mdast）。  
2) **AST → Typst**：生成 `main.typ`（仅内容），并引用 `lib.typ`（模板化样式）。  
3) **Typst(WASM) 编译**：在 Web Worker 内编译 Typst，返回 PDF bytes。  
4) **预览与下载**：主线程将 bytes 组装为 `Blob`（用于下载/新标签打开），同时在页面内预览 PDF（默认不占用侧边栏空间）。

## 交付物（代码落点）

- `src/routes/[lang]/+page.svelte`：Markdown 输入框 + PDF 预览 + 下载（按语言子路径）
- `src/routes/+page.svelte`：根路径语言选择/跳转
- `src/lib/pipeline/markdownToTypst.ts`：Markdown 子集 → Typst 文本
- `src/lib/typst/styles/*`：Typst 排版方案（集中 `set/show/#let`，正文保持纯净；可扩展多风格）
- `src/lib/workers/typst.worker.ts`：WASM 初始化 + 编译入口（message API）
- `src/lib/workers/typstClient.ts`：主线程 Worker 封装（request/response）
- `svelte.config.js`：切换 `@sveltejs/adapter-static`，开启全站 prerender

## 执行步骤（Done 标准）

1. 初始化 SvelteKit 静态站点配置（adapter-static + `export const prerender = true`）。
2. 接入 Typst WASM 编译器（Worker 中懒加载/初始化）。
3. 完成 Markdown→Typst 的最小转换（覆盖上面的子集）。
4. UI 打通：粘贴 Markdown → 自动/手动刷新预览 → 下载 PDF（浏览器可打开）。
5. 验证：`npm run check` 与 `npm run build` 通过；`npm run preview` 可预览并下载 PDF。

## 本地命令

- 开发：`npm run dev`
- 类型检查：`npm run check`
- 构建/预览：`npm run build` / `npm run preview`

## 后续迭代（不在 MVP）

- 字体与离线缓存（CacheStorage/IDB），确保中文稳定
- Markdown Profile + Preflight（错误提示与一键修复）
- 图片/表格/目录/页眉页脚与模板系统（IR → Typst 规范化）
