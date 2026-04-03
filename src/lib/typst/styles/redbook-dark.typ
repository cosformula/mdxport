// 小红书深色卡片风格 (Xiaohongshu Dark Card Style)
// 特点：深色背景、浅色文字、蓝紫强调色、科技感。

#let article(title: "", authors: (), ..args, body) = {
  let lang = args.at("lang", default: "zh")
  let font-choice = args.at("font", default: "sans")

  let sans-fonts = ("IBM Plex Sans", "Roboto", "Libertinus Sans", "Noto Sans CJK SC", "Noto Sans SC", "Noto Color Emoji")
  let serif-fonts = ("Libertinus Serif", "Noto Serif SC", "Noto Serif CJK SC", "Noto Color Emoji")
  let body-fonts = if font-choice == "serif" { serif-fonts } else { sans-fonts }
  let heading-fonts = if font-choice == "serif" { serif-fonts } else { sans-fonts }

  set page(
    width: 105mm,
    height: 140mm,
    margin: (x: 8mm, top: 10mm, bottom: 12mm),
    fill: rgb("#1A1A2E"),
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: 11pt,
    lang: lang,
    fill: rgb("#E8E8E8"),
  )

  set par(
    justify: false,
    leading: 1.1em,
    first-line-indent: 0pt,
    spacing: 1em,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: 0.6em, marker: [•])
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: 0.6em)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#F0F0F0"),
      font: heading-fonts,
    )
    block(above: 1.2em, below: 0.6em, it)
  }
  show heading.where(level: 1): set text(size: 1.5em)
  show heading.where(level: 2): set text(size: 1.25em)
  show heading.where(level: 3): set text(size: 1.1em)

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
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: 0.9em, fill: rgb("#E0E0E0"))

  set table(
    stroke: (paint: rgb("#2A2A4A"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#16213E") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#A78BFA"))

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #text(1.6em, weight: "black", fill: rgb("#F0F0F0"), title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(0.85em, fill: rgb("#888899"), authors.join(" · "))
      ]
    ]
    line(length: 100%, stroke: 0.8pt + rgb("#2A2A4A"))
    v(0.6em)
  }

  body
}
