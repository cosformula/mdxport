<p align="center">
  <img src="static/logo.png" alt="MDXport Logo" width="128" />
</p>

# MDXport

**Markdown 转 PDF，排版一步到位。**

MDXport 是一款基于 [Svelte](https://svelte.dev/) 和 [Typst](https://typst.app/) 构建的强大 Markdown 导出工具。它允许你直接在浏览器中将 Markdown 转换为高质量、商业级的 PDF。

## ✨ 特性

- **Typst 驱动**: 利用 Typst 强大的排版能力，生成专业级文档。
- **隐私优先**: 纯客户端运行（基于 WebAssembly），数据绝不上传服务器，保护你的隐私。
- **实时预览**: Markdown 与 PDF 渲染效果同步实时预览。
- **智能修复**: 自动修复 AI 生成内容中的排版错乱（如表格溢出、标题层级错误等）。
- **丰富语法支持**:
  - 📊 **Mermaid** 图表渲染
  - 📐 **数学公式** (LaTeX 语法)
  - 💻 **代码高亮**
  - 📑 **自动生成目录 (TOC)**
- **即开即用**: 无需安装，无需注册，打开网页即可开始使用。

## 🚀 快速开始

访问 [mdxport.com](https://mdxport.com) 立即开始使用。

### 本地开发

如果你想在本地运行 MDXport：

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
- **Markdown 处理**: [unified](https://unifiedjs.com/) 生态 (remark)
- **PDF 预览**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **图标**: [Lucide](https://lucide.dev/) (SVG)

## 🔗 相关项目

- [mdxport-cli](https://github.com/cosformula/mdxport-cli) - 命令行版本，单二进制，通过 `npm install -g @mdxport/cli` 安装。
- [markdown2typst](https://github.com/Mapaor/markdown2typst) - 由 [@Mapaor](https://github.com/Mapaor) 创建的 Markdown 转 Typst npm 包。

## 📄 开源协议

本项目采用 [MIT 协议](LICENSE)。
