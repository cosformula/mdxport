<p align="center">
  <img src="static/logo.png" alt="MDXport Logo" width="128" />
</p>

# MDXport

**Markdown 转 PDF、卡片、演示文稿，排版一步到位。**

MDXport 是一款基于 [Svelte](https://svelte.dev/) 和 [Typst](https://typst.app/) 构建的强大 Markdown 导出工具。将 Markdown 转换为专业 PDF、小红书图片卡片和演示文稿——全部在浏览器中完成，无需任何配置。

## ✨ 特性

### 三种导出模式

- **PDF 文档** — 专业级 PDF 导出，多种样式可选（现代科技风、经典排版风），内置技术方案、工作周报等模板。
- **小红书卡片** — 导出精美的社交媒体卡片（PNG 格式）。7 种卡片样式（简约、知识分享、暗色、极简、现代、森林、蓝图），支持自定义主题色、尺寸和内容密度。
- **演示文稿** — 用 Markdown 创建幻灯片。3 种主题（现代、暗色、极简），PDF 导出。

### 编辑体验

- **双编辑模式** — 在代码编辑器和所见即所得富文本编辑器（基于 [Milkdown](https://milkdown.dev/)）之间自由切换。
- **实时预览** — 编辑时同步实时预览渲染效果。
- **分页控制** — 使用 `[[pagebreak]]` 在所有模式中控制分页。
- **图片上传** — 直接在文档中嵌入图片。

### 丰富语法

- 📊 **Mermaid** 图表渲染
- 📐 **数学公式**（LaTeX 语法，自动转换为 Typst）
- 💻 **代码高亮**
- 📑 **自动生成目录 (TOC)**

### 内置模板

每种模式都提供开箱即用的模板，帮助你快速上手——从技术文档到知识分享卡片再到技术演讲。

### 更多特性

- **文档管理** — 创建、保存和管理多个文档。自动保存到 IndexedDB，跨会话持久化。
- **智能修复** — 自动修复 AI 生成内容中的排版错乱（如表格溢出、标题层级错误等）。
- **Typst 驱动** — 利用 Typst 强大的排版能力，生成专业级文档。
- **隐私优先** — 纯客户端运行（基于 WebAssembly），数据绝不上传服务器。
- **中英双语** — 完整的中英文界面支持。
- **即开即用** — 无需安装，无需注册，打开网页即可使用。

## 🚀 快速开始

访问 [mdxport.com](https://mdxport.com) 立即开始使用。

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/cosformula/mdxport.git
   cd mdxport
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 🛠️ 技术栈

- **框架**: [Svelte 5](https://svelte.dev/)
- **渲染引擎**: [Typst](https://typst.app/) (WASM)
- **富文本编辑**: [Milkdown](https://milkdown.dev/) (Crepe)
- **Markdown 处理**: [unified](https://unifiedjs.com/) 生态 (remark)
- **PDF 预览**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **图标**: [Lucide](https://lucide.dev/) (SVG)

## 🔗 相关项目

- [mdxport-cli](https://github.com/cosformula/mdxport-cli) - 命令行版本，单二进制，通过 `npm install -g @mdxport/cli` 安装。
- [markdown2typst](https://github.com/Mapaor/markdown2typst) - 由 [@Mapaor](https://github.com/Mapaor) 创建的 Markdown 转 Typst npm 包。

## 📄 开源协议

本项目采用 [MIT 协议](LICENSE)。
