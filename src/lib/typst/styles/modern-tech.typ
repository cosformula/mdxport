// 方案一：现代科技风 (The "Modern Tech" Style)
// 特点：全无衬线（更像网页阅读）、段间距、无首行缩进、代码块现代风格。

#let article(title: "", authors: (), ..args, body) = {
  let lang = args.at("lang", default: "zh")
  // 1) 页面设置：宽边距，利于阅读
  set page(
    paper: "a4",
    margin: (x: 1.8cm, y: 2cm),
    numbering: "1",
  )
  set document(title: title, author: authors)

  // 2) 字体栈：英文/数字用高质量西文字体，中文优先无衬线（屏幕阅读更舒适）
  set text(
    font: ("IBM Plex Sans", "Roboto", "Noto Sans CJK SC", "Noto Serif CJK SC"),
    size: 10.5pt,
    lang: lang,
  )

  // 3) 段落：放弃首行缩进，采用“段间距”模式（更接近网页阅读）
  set par(
    justify: true,
    leading: 1em,
    first-line-indent: 0pt,
    spacing: 1.2em,
  )
  set list(indent: 1em, body-indent: 0.5em, spacing: 0.8em, marker: [•])
  set enum(indent: 1em, body-indent: 0.5em, spacing: 0.8em)

  // 4) 标题：加粗、深灰、留白（建立清晰层级）
  show heading: it => {
    set text(weight: "bold", fill: rgb("#333333"), font: ("IBM Plex Sans", "Noto Sans CJK SC", "Roboto"))
    block(above: 2em, below: 1em, it)
  }

  // 5) 链接颜色：科技蓝
  show link: set text(fill: rgb("#0074de"))

  // 6) 引用块：左侧高亮线 + 浅背景
  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: luma(248),
      stroke: (left: 2pt + rgb("#0074de")),
      inset: (left: 0.9em, right: 0.9em, top: 0.7em, bottom: 0.7em),
      radius: 6pt,
      width: 100%,
      it.body,
    )
  }

  // 7) 行内代码：轻背景 + 圆角（避免只是变成等宽字体）
  show raw.where(block: false): it => box(
    fill: luma(240),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  // 8) 代码块：圆角 + 浅灰背景
  show raw.where(block: true): block.with(
    fill: luma(245),
    inset: 12pt,
    radius: 6pt,
    width: 100%,
    stroke: none,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"))

  // 标题区（可选）
  if title != "" {
    align(center)[
      #text(1.8em, weight: "black", title)
      #if authors.len() > 0 [
        #v(0.35em)
        #text(0.95em, fill: rgb("#555555"), authors.join(", "))
      ]
    ]
    v(1em)
  }

  body
}
