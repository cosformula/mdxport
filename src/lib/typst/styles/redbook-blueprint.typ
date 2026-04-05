// 小红书蓝图卡片风格 (Xiaohongshu Blueprint Card Style)
// 特点：深蓝背景、荧光蓝/青色强调、网格点阵装饰、适合科技/编程类。

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

  set page(
    width: 105mm,
    height: 140mm,
    margin: (x: 8mm, top: 10mm, bottom: 12mm),
    fill: rgb("#0C1B2A"),
    background: {
      // Subtle grid dots
      place(top + left,
        grid(
          columns: (10mm,) * 10,
          rows: (10mm,) * 14,
          ..range(140).map(_ =>
            place(center + horizon, circle(radius: 0.3pt, fill: rgb("#1E3A5F")))
          )
        )
      )
    },
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: body-size,
    lang: lang,
    fill: rgb("#C8DCF0"),
  )

  set par(
    justify: false,
    leading: paragraph-leading,
    first-line-indent: 0pt,
    spacing: paragraph-spacing,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: text(fill: rgb("#38BDF8"), [▸]))
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#E0F0FF"),
      font: heading-fonts,
    )
    set par(leading: heading-leading)
    block(above: heading-above, below: heading-below, it)
  }
  show heading.where(level: 1): set text(size: heading-1-size)
  show heading.where(level: 2): set text(size: heading-2-size)
  show heading.where(level: 3): set text(size: heading-3-size)

  show link: set text(fill: rgb("#38BDF8"))

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: rgb("#0F2640"),
      stroke: (left: 2.5pt + rgb("#38BDF8")),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 4pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: rgb("#162D4A"),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    text(fill: rgb("#7DD3FC"), it),
  )

  show raw.where(block: true): it => block(
    fill: rgb("#0F2640"),
    inset: 10pt,
    radius: 6pt,
    width: 100%,
    stroke: 0.5pt + rgb("#1E3A5F"),
    it,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size, fill: rgb("#A0D8EF"))
  show raw.where(block: true): set par(leading: code-leading)

  set table(
    stroke: (paint: rgb("#1E3A5F"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#0F2640") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#38BDF8"))

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #set par(leading: title-leading)
      #text(title-size, weight: "black", fill: rgb("#E0F0FF"), title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(author-size, fill: rgb("#5A8AAA"), authors.join(" · "))
      ]
    ]
    line(length: 100%, stroke: 1pt + rgb("#1E3A5F"))
    v(0.6em)
  }

  body
}
