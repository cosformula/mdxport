// 小红书素雅卡片风格 (Redbook Clean Card Style)
// 特点：纯白底、单一深色强调、极简结构线、Notion/Linear 风格。

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

  let accent = rgb("#18181B")
  let text-dark = rgb("#18181B")
  let text-sub = rgb("#71717A")
  let bg = white
  let panel = rgb("#FAFAFA")
  let border = rgb("#E4E4E7")

  set page(
    width: layout.at("page-width"),
    height: layout.at("page-height"),
    margin: (x: 10mm, top: 12mm, bottom: 14mm),
    fill: bg,
    background: {
      // Top accent bar
      place(top + left,
        rect(width: layout.at("page-width"), height: 3pt, fill: accent)
      )
      // Subtle bottom-right dot pattern
      place(bottom + right, dx: -6mm, dy: -8mm,
        grid(
          columns: (4mm,) * 3,
          rows: (4mm,) * 3,
          ..range(9).map(_ =>
            place(center + horizon, circle(radius: 0.5pt, fill: border))
          )
        )
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
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: [–])
  set enum(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing)

  show heading: it => {
    set text(
      weight: "bold",
      fill: text-dark,
      font: heading-fonts,
    )
    set par(leading: heading-leading)
    block(above: heading-above, below: heading-below, it)
  }
  show heading.where(level: 1): set text(size: heading-1-size)
  show heading.where(level: 2): it => {
    block(above: heading-above, below: heading-below, {
      stack(dir: ltr, spacing: 0.4em,
        rect(width: 3pt, height: 1em, fill: accent, radius: 1.5pt),
        it.body,
      )
    })
  }
  show heading.where(level: 3): set text(size: heading-3-size)

  show link: set text(fill: text-sub)
  show link: underline

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: panel,
      stroke: (left: 2.5pt + accent),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 0pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: panel,
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  show raw.where(block: true): block.with(
    fill: panel,
    inset: 10pt,
    radius: 4pt,
    width: 100%,
    stroke: 0.5pt + border,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size)
  show raw.where(block: true): set par(leading: code-leading)

  set table(
    stroke: (paint: border, thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { panel } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold")

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #set par(leading: title-leading)
      #text(title-size, weight: "black", fill: text-dark, title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(author-size, fill: text-sub, authors.join(" · "))
      ]
    ]
    line(length: 40%, stroke: 0.8pt + border)
    v(0.6em)
  }

  body
}
