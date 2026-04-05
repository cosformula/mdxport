// 小红书知识卡片风格 (Xiaohongshu Knowledge Card Style)
// 特点：3:4 竖版卡片、暖白背景、小红书红强调色、顶部色条。

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

  let red = rgb("#D4564D")
  let red-light = rgb("#F5E6E5")
  let warm-bg = rgb("#FFFDF7")
  let warm-panel = rgb("#F8F5F0")
  let text-dark = rgb("#2D2D2D")

  set page(
    width: 105mm,
    height: 140mm,
    margin: (x: 10mm, top: 14mm, bottom: 14mm),
    fill: warm-bg,
    background: {
      // Top accent bar
      place(top + left,
        rect(width: 105mm, height: 4pt, fill: red)
      )
      // Subtle warm circle bottom-left
      place(bottom + left, dx: -15mm, dy: 20mm,
        circle(radius: 40mm, fill: rgb("#F5E8E0").transparentize(60%))
      )
    },
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: body-size,
    lang: lang,
    fill: text-dark,
  )

  set par(
    justify: false,
    leading: paragraph-leading,
    first-line-indent: 0pt,
    spacing: paragraph-spacing,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: text(fill: red, [•]))
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing)

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
  show heading.where(level: 2): it => {
    block(above: heading-above, below: heading-below, {
      stack(dir: ltr, spacing: 0.4em,
        rect(width: 3pt, height: 1em, fill: red, radius: 1.5pt),
        it.body,
      )
    })
  }
  show heading.where(level: 3): set text(size: heading-3-size)

  show link: set text(fill: red)

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: red-light,
      stroke: (left: 2.5pt + red),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 4pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: warm-panel,
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  show raw.where(block: true): block.with(
    fill: warm-panel,
    inset: 10pt,
    radius: 6pt,
    width: 100%,
    stroke: none,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size)
  show raw.where(block: true): set par(leading: code-leading)

  set table(
    stroke: (paint: rgb("#E0DDD8"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { warm-panel } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold")

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
