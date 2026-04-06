// 小红书极简卡片风格 (Redbook Minimalist Card Style)
// 特点：纯白背景、黑色文字、极细线条、大量留白。

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
    margin: (x: 10mm, top: 12mm, bottom: 14mm),
    fill: white,
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: body-size,
    lang: lang,
    fill: rgb("#111111"),
  )

  set par(
    justify: false,
    leading: paragraph-leading,
    first-line-indent: 0pt,
    spacing: paragraph-spacing,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: [–])
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#111111"),
      font: heading-fonts,
    )
    set par(leading: heading-leading)
    block(above: heading-above, below: heading-below, it)
  }
  show heading.where(level: 1): set text(size: heading-1-size)
  show heading.where(level: 2): set text(size: heading-2-size)
  show heading.where(level: 3): set text(size: heading-3-size)

  show link: set text(fill: rgb("#111111"))
  show link: underline

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: rgb("#FAFAFA"),
      stroke: (left: 1.5pt + rgb("#CCCCCC")),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 0pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: rgb("#F5F5F5"),
    inset: (x: 3pt, y: 1pt),
    radius: 1pt,
    it,
  )

  show raw.where(block: true): block.with(
    fill: rgb("#F8F8F8"),
    inset: 10pt,
    radius: 2pt,
    width: 100%,
    stroke: 0.5pt + rgb("#E8E8E8"),
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size)
  show raw.where(block: true): set par(leading: code-leading)

  set table(
    stroke: (paint: rgb("#E0E0E0"), thickness: 0.3pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#F8F8F8") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold")

  if title != "" {
    block(width: 100%, inset: (bottom: 1em))[
      #set par(leading: title-leading)
      #text(title-size, weight: "bold", fill: rgb("#111111"), title)
      #if authors.len() > 0 [
        #v(0.3em)
        #text(author-size, fill: rgb("#999999"), authors.join(" · "))
      ]
    ]
    line(length: 40%, stroke: 0.4pt + rgb("#CCCCCC"))
    v(0.8em)
  }

  body
}
