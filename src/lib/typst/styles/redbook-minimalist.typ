// 小红书极简卡片风格 (Xiaohongshu Minimalist Card Style)
// 特点：纯白背景、黑色文字、极细线条、大量留白。

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
    margin: (x: 10mm, top: 12mm, bottom: 14mm),
    fill: white,
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: 11pt,
    lang: lang,
    fill: rgb("#111111"),
  )

  set par(
    justify: false,
    leading: 1.2em,
    first-line-indent: 0pt,
    spacing: 1.1em,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: 0.7em, marker: [–])
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: 0.7em)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#111111"),
      font: heading-fonts,
    )
    block(above: 1.4em, below: 0.7em, it)
  }
  show heading.where(level: 1): set text(size: 1.5em)
  show heading.where(level: 2): set text(size: 1.2em)
  show heading.where(level: 3): set text(size: 1.05em)

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
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: 0.9em)

  set table(
    stroke: (paint: rgb("#E0E0E0"), thickness: 0.3pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#F8F8F8") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold")

  if title != "" {
    block(width: 100%, inset: (bottom: 1em))[
      #text(1.5em, weight: "bold", fill: rgb("#111111"), title)
      #if authors.len() > 0 [
        #v(0.3em)
        #text(0.85em, fill: rgb("#999999"), authors.join(" · "))
      ]
    ]
    line(length: 40%, stroke: 0.4pt + rgb("#CCCCCC"))
    v(0.8em)
  }

  body
}
