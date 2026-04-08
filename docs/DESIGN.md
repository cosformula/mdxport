---
status: draft
owner: formula
version: 0.4
last_reviewed: 2025-12-18
product_name: MDXport
tech_route: typst_wasm_client_only
tags: [prd, markdown, export, pdf, client-only, typst, wasm, sveltekit, ai-doc]
---

# MDXport 设计文档（以当前实现为准）

## 0. 一句话

MDXport 是一个纯前端静态站点：在浏览器里把 Markdown 转成 Typst，然后在 Web Worker 中用 Typst WASM 编译为 vector IR，通过 typst.ts renderer 渲染为 SVG 预览；导出时按需编译 PDF 下载。

> 本文把“已落地实现”与“路线图”分开写：**默认以代码现状为准**。

---

## 1. 当前版本范围（v0.0.1）

### 1.1 已实现能力

- **编辑与导出**：左侧 Markdown 编辑、右侧 PDF 实时预览；支持下载与新标签页打开（`src/lib/components/MainEditor.svelte`）。
- **多语言路由**：`/zh/` 与 `/en/` 两套入口；根路径按本地偏好跳转（`src/routes/+page.svelte`、`src/routes/[lang]/*`）。
- **模板/样式**：两套 Typst 风格 `modern-tech` / `classic-editorial`（`src/lib/typst/styles/*`）。
- **Mermaid**：支持 ```mermaid fenced block；预处理为 SVG 并注入 Typst VFS（`src/lib/mermaid/render.ts` + `MainEditor` 预处理）。
- **转换管线**：Markdown（mdast）→ Typst 源码 → Typst(WASM) 编译 → PDF bytes（`src/lib/pipeline/markdownToTypst.ts`、`src/lib/workers/*`）。

### 1.2 现阶段未实现（但文档/宣传里可能提到过）

- Preflight（诊断与一键修复）
- 稳定的 Document IR（当前是 mdast 直接渲染为 Typst）
- “默认离线”与字体/资源本地化（当前字体通过网络 URL 加载）
- 通用图片/附件导入（目前仅 Mermaid 生成资源能稳定进入 VFS）

---

## 2. Markdown Profile（当前支持范围）

### 2.1 YAML Frontmatter（用于模板元信息）

解析实现：`src/lib/pipeline/markdownToTypst.ts`（`parseFrontmatter*`）。

- `title`: string
- `author`: string
- `authors`: string[]（也支持 `authors: [a, b]` 或 YAML 列表）
- `lang` / `language`: `zh` / `en`

标题取值优先级：`options.title` → `frontmatter.title` → “开头第一个 H1”。

### 2.2 块级语法（Block）

- 标题：H1~H6
- 段落
- 有序/无序列表（支持嵌套）
- 引用块
- fenced 代码块
- 分隔线（`---`）
- GFM 表格
- 数学块（`$$...$$`）

### 2.3 行内语法（Inline）

- 加粗、斜体、删除线（GFM）
- 行内代码
- 链接（内联 / 引用式）
- 行内数学（`$...$`）
- 脚注引用（GFM footnote）
- 上标/下标（`^sup^` / `~sub~`，自定义插件）

### 2.4 特殊约定

- `[toc]`：当某段落内容**恰好等于** `[toc]`（忽略大小写与首尾空白）时，生成 Typst `#outline(...)`。
- Mermaid：`MainEditor` 会把 ```mermaid 块渲染成 SVG，再替换为 Markdown 图片引用 `![](<id>.svg)`，并把 SVG bytes 注入编译 VFS。

### 2.5 已知限制/不完整支持（重要）

- **任务列表**（`- [x]` / `- [ ]`）：checkbox 状态目前会丢失，退化为普通列表。
- **普通图片**：`![](path-or-url)` 会渲染为 Typst `#image("...")`，但除 Mermaid 外目前没有把图片 bytes 注入 VFS 的通用入口；远程 URL 也不会自动下载，因此可能导致 Typst 编译失败。
- **内嵌 HTML**：mdast 的 `html` 节点目前未渲染（等价于忽略/丢弃），不建议依赖。
- **高亮**：代码里有 `mark` 分支，但 `remark-mark` 目前未启用，因此 `==highlight==` 不保证可用。

---

## 3. 系统架构（当前实现）

### 3.1 数据流（从输入到 PDF）

```
Markdown (string)
  ├─ Mermaid 预处理：```mermaid → SVG bytes → ![](id.svg)
  ├─ markdownToTypst：mdast → main.typ
  └─ TypstWorkerClient.compilePdf(main.typ, images)
        └─ typst.worker：
            - 初始化/升级 Typst 编译器（WASM）
            - 字体加载（按需加载 CJK/Emoji）
            - 注入 /main.typ 与图片 bytes（VFS）
            - compile → PDF bytes + diagnostics

Vector IR
  ├─ typst.ts renderer → SVG 预览（分页提取，每页独立 SVG）
  └─ 导出时按需 compile PDF → Blob URL 下载
```

### 3.2 模块与职责（代码落点）

- UI：
  - `src/lib/components/PdfEditor.svelte`：编辑器、编译触发（防抖+取消序列）、Mermaid 预处理、SVG 预览渲染
  - `src/lib/components/CardsEditor.svelte`：卡片模式，逐页独立编译 + SVG 预览
  - `src/lib/components/SlidesEditor.svelte`：演示文稿模式，逐页独立编译 + SVG 预览
- Pipeline：
  - `src/lib/pipeline/markdownToTypst.ts`：统一解析与渲染；`markdownToTypstPages()` 支持逐页输出独立 Typst 源码
- Worker：
  - `src/lib/workers/typstClient.ts`：主线程调用封装（`compilePdf` / `compileVector`）
  - `src/lib/workers/typst.worker.ts`：WASM 初始化、字体加载、注入 typst 源与资源、编译队列（支持 PDF 和 vector 两种输出格式）
- Preview：
  - `src/lib/typst/renderer.ts`：typst.ts SVG 渲染器懒加载封装
  - `src/lib/typst/svg-utils.ts`：从复合 SVG 中按页提取独立 SVG
- Typst 样式：
  - `src/lib/typst/styles/*`：风格化模板入口 `article(...)`

---

## 4. Typst 模板系统（当前形态）

### 4.1 约束：样式在模板、正文只生成内容

当前 `markdownToTypst` 只负责：

1) 选择并 `#import "styles/<style>.typ": article`
2) `#show: article.with(title/authors/lang)`
3) 把 Markdown 内容节点渲染成 Typst markup（heading/list/table/raw/...）

所有排版规则（字体栈、段落、标题、引用、代码块样式等）集中在 `src/lib/typst/styles/*`。

### 4.2 新增风格（约定流程）

1) 新建 `src/lib/typst/styles/<new-style>.typ`，并暴露 `#let article(...) = { ... }`
2) 扩展 `src/lib/pipeline/markdownToTypst.ts`：
   - `TypstStyleId` 加新枚举
   - `STYLE_TO_TEMPLATE` 登记 `{ path, entry }`
3) 扩展 `src/lib/workers/typst.worker.ts`：
   - `import ...?raw`
   - `compiler.addSource('/styles/<new-style>.typ', ...)`

> 备注：`src/lib/typst/lib.typ` 仍在仓库中，但当前未被转换器使用，可视为历史/备用模板。

---

## 5. 字体与联网策略（现状与目标）

### 5.1 现状（代码真实行为）

- Typst Worker 会从网络 URL 加载字体资源（`src/lib/workers/typst.worker.ts`）。
- 通过正则检测文档内容，若包含 **CJK 或 Emoji** 则升级编译器并额外加载对应字体。

这意味着：

- **首次渲染可能需要联网**（尤其是包含中文/emoji 的文档）
- 离线场景下可能出现“字体缺失/编译失败/渲染退化”

### 5.2 目标（与“默认离线”方向一致）

- 字体与 WASM 资源本地化（放入 `static/` 或走 Vite asset），并可持久化缓存（CacheStorage/IDB）
- 远程资源加载必须显式 opt-in（例如开关或“在线字体提供器”选项）

---

## 6. 路线图（从现状往前走）

- Preflight：把常见 AI 草稿问题（表格、列表、代码围栏、超长 token、外链图片等）做成诊断+修复
- 资源管线：图片/附件导入 → VFS 映射 → 引用管理
- 离线字体包：Basic/Full、缓存、可选子集化（移动端内存峰值控制）
- Typst 映射增强：任务列表 checkbox、表格列宽策略、图片 caption 与尺寸控制

---

## 7. 质量与回归（建议补齐）

当前未配置测试框架；建议尽早准备导出回归 fixtures：

- `tests/fixtures/*.md`：覆盖表格、长文、数学、emoji、Mermaid、极长 URL/Token、混合中英
- 批量编译校验：`diagnostics` 可接受、PDF bytes 非空、页数/体积在合理阈值内
