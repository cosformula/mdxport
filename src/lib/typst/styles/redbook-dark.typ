// 小红书深色卡片风格 (Redbook Dark Card Style)
// 特点：深色背景、浅色文字、蓝紫强调色、科技感。

#import "redbook-typography.typ": resolve-layout, resolve-tokens

#let article(title: "", authors: (), ..args, body) = {
  let lang = args.at("lang", default: "zh")
  let font-choice = args.at("font", default: "sans")
  let size-preset = args.at("size", default: "compact")
  let density-preset = args.at("density", default: "comfortable")
  let export-preset = args.at("preset", default: "redbook-portrait")
  let tokens = resolve-tokens(size: size-preset, density: density-preset)
  let layout = resolve-layout(preset: export-preset)

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
    width: layout.at("page-width"),
    height: layout.at("page-height"),
    margin: (x: 8mm, top: 10mm, bottom: 12mm),
    fill: rgb("#1A1A2E"),
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: body-size,
    lang: lang,
    fill: rgb("#E8E8E8"),
  )

  set par(
    justify: false,
    leading: paragraph-leading,
    first-line-indent: 0pt,
    spacing: paragraph-spacing,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: [•])
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#F0F0F0"),
      font: heading-fonts,
    )
    set par(leading: heading-leading)
    block(above: heading-above, below: heading-below, it)
  }
  show heading.where(level: 1): set text(size: heading-1-size)
  show heading.where(level: 2): set text(size: heading-2-size)
  show heading.where(level: 3): set text(size: heading-3-size)

  show link: set text(fill: rgb("#A78BFA"))

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: rgb("#16213E"),
      stroke: (left: 2.5pt + rgb("#7C73E6")),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 4pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: rgb("#0F3460"),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  show raw.where(block: true): block.with(
    fill: rgb("#0F3460"),
    inset: 10pt,
    radius: 6pt,
    width: 100%,
    stroke: none,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size, fill: rgb("#E0E0E0"))
  show raw.where(block: true): set par(leading: code-leading)

  set table(
    stroke: (paint: rgb("#2A2A4A"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#16213E") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#A78BFA"))

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #set par(leading: title-leading)
      #text(title-size, weight: "black", fill: rgb("#F0F0F0"), title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(author-size, fill: rgb("#888899"), authors.join(" · "))
      ]
    ]
    line(length: 100%, stroke: 0.8pt + rgb("#2A2A4A"))
    v(0.6em)
  }

  body
}
