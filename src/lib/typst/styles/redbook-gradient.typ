// 小红书渐变卡片风格 (Xiaohongshu Gradient Card Style)
// 特点：多层渐变背景、柔和色彩、圆角元素、现代感强、适合生活/美妆类。

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

  let pink = rgb("#E8668A")
  let purple = rgb("#C084FC")
  let peach = rgb("#F9A8D4")

  set page(
    width: 105mm,
    height: 140mm,
    margin: (x: 10mm, top: 12mm, bottom: 14mm),
    fill: rgb("#FFF5F5"),
    background: {
      // Large soft blob bottom-right
      place(bottom + right, dx: 15mm, dy: 15mm,
        circle(radius: 55mm, fill: rgb("#FFE0EC").transparentize(55%))
      )
      // Secondary blob top-left
      place(top + left, dx: -20mm, dy: -25mm,
        circle(radius: 40mm, fill: purple.transparentize(88%))
      )
      // Small accent dot
      place(top + right, dx: -12mm, dy: 16mm,
        circle(radius: 3mm, fill: peach.transparentize(40%))
      )
      // Top gradient stripe
      place(top + left,
        rect(width: 105mm, height: 3pt, fill: gradient.linear(pink, purple, angle: 0deg))
      )
    },
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: body-size,
    lang: lang,
    fill: rgb("#3D3044"),
  )

  set par(
    justify: false,
    leading: paragraph-leading,
    first-line-indent: 0pt,
    spacing: paragraph-spacing,
  )
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: text(fill: pink, [●]))
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing)

  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#2D2038"),
      font: heading-fonts,
    )
    set par(leading: heading-leading)
    block(above: heading-above, below: heading-below, it)
  }
  show heading.where(level: 1): set text(size: heading-1-size)
  show heading.where(level: 2): it => {
    block(above: heading-above, below: heading-below, {
      stack(dir: ltr, spacing: 0.4em,
        rect(width: 3pt, height: 1em, fill: gradient.linear(pink, purple), radius: 1.5pt),
        it.body,
      )
    })
  }
  show heading.where(level: 3): set text(size: heading-3-size)

  show link: set text(fill: rgb("#D94F7A"))

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: rgb("#FFF0F5"),
      stroke: (left: 3pt + gradient.linear(pink, purple)),
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
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size)
  show raw.where(block: true): set par(leading: code-leading)

  set table(
    stroke: (paint: rgb("#F0D0E0"), thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { rgb("#FFF0F5") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#D94F7A"))

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #set par(leading: title-leading)
      #text(title-size, weight: "black", fill: rgb("#2D2038"), title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(author-size, fill: rgb("#A08090"), authors.join(" · "))
      ]
    ]
    line(length: 60%, stroke: 1.5pt + gradient.linear(pink, purple))
    v(0.6em)
  }

  body
}
