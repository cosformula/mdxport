// 小红书蓝图卡片风格 (Xiaohongshu Blueprint Card Style)
// 特点：深蓝背景、荧光蓝/青色强调、网格点阵装饰、适合科技/编程类。

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
    size: 11pt,
    lang: lang,
    fill: rgb("#C8DCF0"),
  )

  set par(
    justify: false,
    leading: 1.1em,
    first-line-indent: 0pt,
    spacing: 1em,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: 0.6em, marker: text(fill: rgb("#38BDF8"), [▸]))
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: 0.6em)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#E0F0FF"),
      font: heading-fonts,
    )
    block(above: 1.2em, below: 0.6em, it)
  }
  show heading.where(level: 1): set text(size: 1.5em)
  show heading.where(level: 2): set text(size: 1.25em)
  show heading.where(level: 3): set text(size: 1.1em)

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
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: 0.9em, fill: rgb("#A0D8EF"))

  set table(
    stroke: (paint: rgb("#1E3A5F"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#0F2640") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#38BDF8"))

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #text(1.6em, weight: "black", fill: rgb("#E0F0FF"), title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(0.85em, fill: rgb("#5A8AAA"), authors.join(" · "))
      ]
    ]
    line(length: 100%, stroke: 1pt + rgb("#1E3A5F"))
    v(0.6em)
  }

  body
}
