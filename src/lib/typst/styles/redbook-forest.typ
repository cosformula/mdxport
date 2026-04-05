// 小红书森林卡片风格 (Xiaohongshu Forest Card Style)
// 特点：自然绿色调、大地色系、清新治愈、适合学习/读书笔记。

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
    fill: rgb("#F5F9F0"),
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: 11pt,
    lang: lang,
    fill: rgb("#2D3B2D"),
  )

  set par(
    justify: false,
    leading: 1.1em,
    first-line-indent: 0pt,
    spacing: 1em,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: 0.6em, marker: text(fill: rgb("#5B8C5A"), [◆]))
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: 0.6em)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#2D4A2D"),
      font: heading-fonts,
    )
    block(above: 1.2em, below: 0.6em, it)
  }
  show heading.where(level: 1): set text(size: 1.5em)
  show heading.where(level: 2): set text(size: 1.25em)
  show heading.where(level: 3): set text(size: 1.1em)

  show link: set text(fill: rgb("#5B8C5A"))

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: rgb("#EDF5E8"),
      stroke: (left: 2.5pt + rgb("#5B8C5A")),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 4pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: rgb("#E8F0E4"),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  show raw.where(block: true): block.with(
    fill: rgb("#EBF2E6"),
    inset: 10pt,
    radius: 6pt,
    width: 100%,
    stroke: 0.5pt + rgb("#C8DCC0"),
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: 0.9em)

  set table(
    stroke: (paint: rgb("#C8DCC0"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#E0ECDA") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#3D6B3D"))

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #text(1.6em, weight: "black", fill: rgb("#2D4A2D"), title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(0.85em, fill: rgb("#7A9A7A"), authors.join(" · "))
      ]
    ]
    line(length: 100%, stroke: 0.8pt + rgb("#C8DCC0"))
    v(0.6em)
  }

  body
}
