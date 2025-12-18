// 方案二：经典阅读风 (The "Classic Editorial" Style)
// 特点：正文衬线、标题无衬线对比、首行缩进、引用块左侧竖线。

#let article(title: "", authors: (), ..args, body) = {
  let lang = args.at("lang", default: "zh")
  set page(paper: "a4", margin: (x: 2.5cm, y: 2.5cm))
  set document(title: title, author: authors)

  // 1) 字体：正文衬线 + 英文字体兜底（更像纸质阅读），标题单独用无衬线建立对比，末尾添加 emoji 字体
  set text(
    font: (
      "Libertinus Serif",
      "Noto Serif SC",
      "Noto Serif CJK SC",
      "Noto Color Emoji",
    ),
    size: 12pt,
    lang: lang,
  )

  // 2) 段落：传统书籍排版（但略增行距/段距，避免过紧）
  set par(
    justify: true,
    leading: 1.1em,
    first-line-indent: 2em,
    spacing: 0.9em,
  )
  set list(indent: 1em, body-indent: 0.5em, spacing: 0.6em, marker: [•])
  set enum(indent: 1em, body-indent: 0.5em, spacing: 0.6em)

  // 3) 标题：无衬线形成对比 + 加粗 + 深灰
  show heading: it => {
    set text(font: ("IBM Plex Sans", "Noto Sans CJK SC"), weight: "bold", fill: rgb("#333333"))
    block(above: 2em, below: 1em, it)
  }
  show heading.where(level: 1): it => {
    set align(center)
    set text(size: 1.5em, weight: "bold")
    block(above: 2em, below: 1em, it)
  }

  // 4) 引用块：左侧竖线
  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: luma(248),
      stroke: (left: 2pt + gray),
      inset: (left: 0.9em, right: 0.2em, top: 0.15em, bottom: 0.15em),
      radius: 3pt,
      width: 100%,
      it.body,
    )
  }

  // 5) 行内代码：轻背景 + 圆角
  show raw.where(block: false): it => box(
    fill: luma(240),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  // 6) 代码块：浅灰背景 + 圆角
  show raw.where(block: true): block.with(
    fill: luma(245),
    inset: 10pt,
    radius: 5pt,
    width: 100%,
    stroke: luma(220),
  )
  show raw: set text(font: ("DejaVu Sans Mono",))

  // 标题区（可选）
  if title != "" {
    align(center)[
      #text(2em, weight: "bold", font: "Noto Serif CJK SC", title)
      #if authors.len() > 0 [
        #v(0.35em)
        #text(0.95em, authors.join(", "))
      ]
      #v(0.5em)
      #line(length: 100%, stroke: 0.5pt + gray)
      #v(2em)
    ]
  }

  body
}
