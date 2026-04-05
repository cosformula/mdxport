// 小红书知识卡片风格 (Xiaohongshu Knowledge Card Style)
// 特点：3:4 竖版卡片、大字号手机友好、暖白背景、小红书红强调色。

#import "redbook-typography.typ": resolve-tokens

#let article(title: "", authors: (), ..args, body) = {
  let lang = args.at("lang", default: "zh")
  let font-choice = args.at("font", default: "sans")
  let size-preset = args.at("size", default: "compact")
  let density-preset = args.at("density", default: "comfortable")
  let tokens = resolve-tokens(size: size-preset, density: density-preset)

  let sans-fonts = ("IBM Plex Sans", "Roboto", "Libertinus Sans", "Noto Sans CJK SC", "Noto Sans SC", "Noto Color Emoji")
  let serif-fonts = ("Libertinus Serif", "Noto Serif SC", "Noto Serif CJK SC", "Noto Color Emoji")
  let body-fonts = if font-choice == "serif" { serif-fonts } else { sans-fonts }
  let heading-fonts = if font-choice == "serif" { serif-fonts } else { sans-fonts }
  let body-size = tokens.at("body-size")
  let heading-1-size = tokens.at("heading-1-size")
  let heading-2-size = tokens.at("heading-2-size")
  let heading-3-size = tokens.at("heading-3-size")
  let code-size = tokens.at("code-size")
  let title-size = tokens.at("title-size")
  let author-size = tokens.at("author-size")
  let paragraph-leading = tokens.at("paragraph-leading")
  let paragraph-spacing = tokens.at("paragraph-spacing")
  let heading-above = tokens.at("heading-above")
  let heading-below = tokens.at("heading-below")
  let heading-leading = tokens.at("heading-leading")
  let code-leading = tokens.at("code-leading")
  let title-leading = tokens.at("title-leading")
  let list-spacing = tokens.at("list-spacing")

  // 1) 页面设置：3:4 竖版卡片，暖白背景，无页码
  set page(
    width: 105mm,
    height: 140mm,
    margin: (x: 8mm, top: 10mm, bottom: 12mm),
    fill: rgb("#FFFDF7"),
  )
  set document(title: title, author: authors)

  // 2) 字体栈
  set text(
    font: body-fonts,
    size: body-size,
    lang: lang,
    fill: rgb("#2D2D2D"),
  )

  // 3) 段落：左对齐（窄版面 ragged-right 更易读）、宽松间距
  set par(
    justify: false,
    leading: paragraph-leading,
    first-line-indent: 0pt,
    spacing: paragraph-spacing,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: [•])
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing)

  // 4) 标题：加粗、紧凑层级
  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#1A1A1A"),
      font: heading-fonts,
    )
    set par(leading: heading-leading)
    block(above: heading-above, below: heading-below, it)
  }
  show heading.where(level: 1): set text(size: heading-1-size)
  show heading.where(level: 2): set text(size: heading-2-size)
  show heading.where(level: 3): set text(size: heading-3-size)

  // 5) 链接颜色：小红书红
  show link: set text(fill: rgb("#D4564D"))

  // 6) 引用块：左侧红色线 + 浅暖背景
  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: rgb("#F8F5F0"),
      stroke: (left: 2.5pt + rgb("#D4564D")),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 4pt,
      width: 100%,
      it.body,
    )
  }

  // 7) 行内代码
  show raw.where(block: false): it => box(
    fill: rgb("#F0EDE8"),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  // 8) 代码块：暖灰背景
  show raw.where(block: true): block.with(
    fill: rgb("#F5F3EE"),
    inset: 10pt,
    radius: 6pt,
    width: 100%,
    stroke: none,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size)
  show raw.where(block: true): set par(leading: code-leading)

  // 9) 表格：暖色调
  set table(
    stroke: (paint: rgb("#E0DDD8"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#F0EDE8") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold")

  // 标题区
  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #set par(leading: title-leading)
      #text(title-size, weight: "black", fill: rgb("#1A1A1A"), title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(author-size, fill: rgb("#888888"), authors.join(" · "))
      ]
    ]
    line(length: 100%, stroke: 0.8pt + rgb("#E0DDD8"))
    v(0.6em)
  }

  body
}
