// 小红书蓝图卡片风格 (Xiaohongshu Blueprint Card Style)
// 特点：深蓝背景、荧光蓝/青色强调、网格点阵装饰、角标、适合科技/编程类。

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

  let accent = rgb("#38BDF8")
  let accent-dim = rgb("#1E5A8F")
  let bg-dark = rgb("#0C1B2A")
  let bg-panel = rgb("#0F2640")
  let grid-color = rgb("#1A3050")
  let text-primary = rgb("#C8DCF0")
  let text-heading = rgb("#E0F0FF")

  set page(
    width: 105mm,
    height: 140mm,
    margin: (x: 10mm, top: 12mm, bottom: 14mm),
    fill: bg-dark,
    background: {
      // Grid dots
      place(top + left,
        grid(
          columns: (10mm,) * 10,
          rows: (10mm,) * 14,
          ..range(140).map(_ =>
            place(center + horizon, circle(radius: 0.3pt, fill: grid-color))
          )
        )
      )
      // Top-left corner bracket
      place(top + left, dx: 4mm, dy: 4mm, {
        place(line(length: 8mm, stroke: 0.8pt + accent-dim))
        place(line(start: (0pt, 0pt), end: (0pt, 8mm), stroke: 0.8pt + accent-dim))
      })
      // Bottom-right corner bracket
      place(bottom + right, dx: -4mm, dy: -4mm, {
        place(line(start: (-8mm, 0pt), end: (0pt, 0pt), stroke: 0.8pt + accent-dim))
        place(line(start: (0pt, -8mm), end: (0pt, 0pt), stroke: 0.8pt + accent-dim))
      })
      // Subtle accent glow top-right
      place(top + right, dx: 10mm, dy: -20mm,
        circle(radius: 35mm, fill: accent.transparentize(94%))
      )
    },
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: body-size,
    lang: lang,
    fill: text-primary,
  )

  set par(
    justify: false,
    leading: paragraph-leading,
    first-line-indent: 0pt,
    spacing: paragraph-spacing,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: text(fill: accent, [▸]))
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing)

  show heading: it => {
    set text(
      weight: "bold",
      fill: text-heading,
      font: heading-fonts,
    )
    set par(leading: heading-leading)
    block(above: heading-above, below: heading-below, it)
  }
  show heading.where(level: 1): set text(size: heading-1-size)
  show heading.where(level: 2): set text(size: heading-2-size)
  show heading.where(level: 3): set text(size: heading-3-size)

  show link: set text(fill: accent)

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: bg-panel,
      stroke: (left: 2.5pt + accent),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 4pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: bg-panel,
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    text(fill: rgb("#7DD3FC"), it),
  )

  show raw.where(block: true): it => block(
    fill: bg-panel,
    inset: 10pt,
    radius: 6pt,
    width: 100%,
    stroke: 0.5pt + grid-color,
    it,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size, fill: rgb("#A0D8EF"))
  show raw.where(block: true): set par(leading: code-leading)

  set table(
    stroke: (paint: grid-color, thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { bg-panel } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: accent)

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #set par(leading: title-leading)
      #text(title-size, weight: "black", fill: text-heading, title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(author-size, fill: rgb("#5A8AAA"), authors.join(" · "))
      ]
    ]
    line(length: 100%, stroke: 1pt + grid-color)
    v(0.6em)
  }

  body
}
