// 小红书渐变卡片风格 (Xiaohongshu Gradient Card Style)
// 特点：柔和渐变背景、圆角元素、现代感强、适合生活/美妆类。

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
    fill: rgb("#FFF5F5"),
    background: place(bottom + right, dx: 20mm, dy: 20mm,
      circle(radius: 60mm, fill: rgb("#FFE0EC").transparentize(60%))
    ),
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: 11pt,
    lang: lang,
    fill: rgb("#3D3044"),
  )

  set par(
    justify: false,
    leading: 1.1em,
    first-line-indent: 0pt,
    spacing: 1em,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: 0.6em, marker: text(fill: rgb("#E8668A"), [●]))
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: 0.6em)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#2D2038"),
      font: heading-fonts,
    )
    block(above: 1.2em, below: 0.6em, it)
  }
  show heading.where(level: 1): set text(size: 1.5em)
  show heading.where(level: 2): set text(size: 1.25em)
  show heading.where(level: 3): set text(size: 1.1em)

  show link: set text(fill: rgb("#D94F7A"))

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: rgb("#FFF0F5"),
      stroke: (left: 3pt + gradient.linear(rgb("#E8668A"), rgb("#C084FC"))),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 6pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: rgb("#F5EBF0"),
    inset: (x: 3pt, y: 1pt),
    radius: 3pt,
    it,
  )

  show raw.where(block: true): block.with(
    fill: rgb("#F8F0F5"),
    inset: 10pt,
    radius: 8pt,
    width: 100%,
    stroke: 0.5pt + rgb("#F0D0E0"),
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: 0.9em)

  set table(
    stroke: (paint: rgb("#F0D0E0"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#FFF0F5") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#D94F7A"))

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #text(1.6em, weight: "black", fill: rgb("#2D2038"), title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(0.85em, fill: rgb("#A08090"), authors.join(" · "))
      ]
    ]
    line(length: 60%, stroke: 1.5pt + gradient.linear(rgb("#E8668A"), rgb("#C084FC")))
    v(0.6em)
  }

  body
}
