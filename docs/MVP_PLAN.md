# MDXport MVP 计划（截至 2025-12-18 的现状）

## 目标与范围

**目标**：在纯前端（静态部署）架构下，实现「输入 Markdown → 生成 PDF 预览 → 下载/打开 PDF」的闭环。

**工程约束**（见 `docs/ENG.md`）：

- 全站静态 prerender（SvelteKit + adapter-static）
- 禁止 `+server.ts` 与 form actions
- Typst/WASM 必须在浏览器运行时初始化，并放在 Worker 内编译

---

## 已完成（v0.0.1 现状）

### 核心链路

- Markdown（mdast）→ Typst 源码：`src/lib/pipeline/markdownToTypst.ts`
- Typst(WASM) 编译（Worker）：`src/lib/workers/typst.worker.ts`
- 主线程封装：`src/lib/workers/typstClient.ts`
- SVG 预览（typst.ts renderer）：`src/lib/typst/renderer.ts` + `src/lib/typst/svg-utils.ts`

### 路由与静态部署

- 全站 `prerender = true` + `trailingSlash = 'always'`：`src/routes/+layout.ts`
- `/zh/`、`/en/` 两套入口，动态段通过 `entries` 枚举：`src/routes/[lang]/*`

### MVP 级 Markdown 支持（实现已落地）

覆盖了最常见的 AI 文档交付语法（详见 `docs/DESIGN.md`）：

- 标题、段落、粗体/斜体/删除线、链接（含引用式）
- 列表（支持嵌套）
- fenced 代码块、行内代码
- GFM 表格
- 数学公式（`$...$` / `$$...$$`）
- 脚注
- `[toc]` → Typst `#outline(...)`
- Mermaid：```mermaid → SVG → 注入 VFS（作为图片编译）

---

## 下一步（建议作为 v0.0.2 / v0.1）

按风险优先级排序：

1) **离线与资源策略对齐**：字体与 wasm 资源本地化 + 缓存；Analytics 可开关（当前存在联网点）。
2) **图片管线**：拖拽/粘贴/上传图片 → 注入 VFS → 引用管理（目前除 Mermaid 外缺少通用入口）。
3) **Preflight（诊断+修复）**：把“会导致编译失败/版式事故”的问题变成可解释、可一键修复的规则集。
4) **渲染增强**：任务列表 checkbox、表格列宽策略、图片 caption/尺寸控制。

---

## 验收建议（可回归）

项目未引入测试框架时，也建议准备导出回归的最小集合：

- `tests/fixtures/*.md`：表格、长文、数学、emoji、Mermaid、极长 URL/Token、混合中英
- 批量导出校验：PDF bytes 非空、`diagnostics` 可接受、页数/体积在合理阈值内
