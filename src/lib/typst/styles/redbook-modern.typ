// 小红书现代卡片风格 (Redbook Modern Card Style)
// 特点：渐变装饰、圆角元素、多主题色支持。

#import "redbook-typography.typ": resolve-layout, resolve-tokens

#let _themes = (
  "pink": (
    accent: rgb("#E8668A"),
    accent2: rgb("#C084FC"),
    bg: rgb("#FFF5F5"),
    blob1: rgb("#FFE0EC"),
    blob2: rgb("#C084FC"),
    panel: rgb("#F8F0F5"),
    panel-border: rgb("#F0D0E0"),
    quote-bg: rgb("#FFF0F5"),
    text-dark: rgb("#2D2038"),
    text-sub: rgb("#A08090"),
    table-header: rgb("#FFF0F5"),
  ),
  "indigo": (
    accent: rgb("#4F6AF0"),
    accent2: rgb("#60A5FA"),
    bg: rgb("#FAFBFF"),
    blob1: rgb("#60A5FA"),
    blob2: rgb("#4F6AF0"),
    panel: rgb("#F1F5F9"),
    panel-border: rgb("#E2E8F0"),
    quote-bg: rgb("#F0F4FF"),
    text-dark: rgb("#1E293B"),
    text-sub: rgb("#64748B"),
    table-header: rgb("#F1F5F9"),
  ),
  "amber": (
    accent: rgb("#D97706"),
    accent2: rgb("#F59E0B"),
    bg: rgb("#FAFAF9"),
    blob1: rgb("#F59E0B"),
    blob2: rgb("#D97706"),
    panel: rgb("#F5F5F4"),
    panel-border: rgb("#E7E5E4"),
    quote-bg: rgb("#FFFBEB"),
    text-dark: rgb("#292524"),
    text-sub: rgb("#78716C"),
    table-header: rgb("#F5F5F4"),
  ),
  "teal": (
    accent: rgb("#0D9488"),
    accent2: rgb("#2DD4BF"),
    bg: rgb("#F8FFFE"),
    blob1: rgb("#2DD4BF"),
    blob2: rgb("#0D9488"),
    panel: rgb("#F0FDFA"),
    panel-border: rgb("#CCFBF1"),
    quote-bg: rgb("#F0FDFA"),
    text-dark: rgb("#134E4A"),
    text-sub: rgb("#5F8A85"),
    table-header: rgb("#F0FDFA"),
  ),
  "rose": (
    accent: rgb("#E11D48"),
    accent2: rgb("#FB7185"),
    bg: rgb("#FFFBFB"),
    blob1: rgb("#FB7185"),
    blob2: rgb("#E11D48"),
    panel: rgb("#FFF1F2"),
    panel-border: rgb("#FFE4E6"),
    quote-bg: rgb("#FFF1F2"),
    text-dark: rgb("#1C1917"),
    text-sub: rgb("#78716C"),
    table-header: rgb("#FFF1F2"),
  ),
  "violet": (
    accent: rgb("#7C3AED"),
    accent2: rgb("#A78BFA"),
    bg: rgb("#FAFAFF"),
    blob1: rgb("#A78BFA"),
    blob2: rgb("#7C3AED"),
    panel: rgb("#F5F3FF"),
    panel-border: rgb("#EDE9FE"),
    quote-bg: rgb("#F5F3FF"),
    text-dark: rgb("#1E1B2E"),
    text-sub: rgb("#6B6890"),
    table-header: rgb("#F5F3FF"),
  ),
)

#let article(title: "", authors: (), ..args, body) = {
  let lang = args.at("lang", default: "zh")
  let font-choice = args.at("font", default: "sans")
  let size-preset = args.at("size", default: "compact")
  let density-preset = args.at("density", default: "comfortable")
  let theme-name = args.at("theme", default: "indigo")
  let export-preset = args.at("preset", default: "redbook-portrait")
  let tokens = resolve-tokens(size: size-preset, density: density-preset)
  let layout = resolve-layout(preset: export-preset)
  let theme = _themes.at(theme-name, default: _themes.at("indigo"))

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

  let accent = theme.at("accent")
  let accent2 = theme.at("accent2")
  let text-dark = theme.at("text-dark")
  let text-sub = theme.at("text-sub")
  let panel = theme.at("panel")
  let panel-border = theme.at("panel-border")

  set page(
    width: layout.at("page-width"),
    height: layout.at("page-height"),
    margin: (x: 10mm, top: 12mm, bottom: 14mm),
    fill: theme.at("bg"),
    background: {
      // Soft blob bottom-right
      place(bottom + right, dx: 20mm, dy: 20mm,
        circle(radius: 60mm, fill: theme.at("blob1").transparentize(88%))
      )
      // Subtle ambient glow top-left
      place(top + left, dx: -30mm, dy: -35mm,
        circle(radius: 55mm, fill: theme.at("blob2").transparentize(93%))
      )
      // Top gradient stripe
      place(top + left,
        rect(width: layout.at("page-width"), height: 3pt, fill: gradient.linear(accent, accent2, angle: 0deg))
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
  set list(indent: 0.8em, body-indent: 0.4em, spacing: list-spacing, marker: text(fill: accent, [●]))
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
        rect(width: 3pt, height: 1em, fill: gradient.linear(accent, accent2), radius: 1.5pt),
        it.body,
      )
    })
  }
  show heading.where(level: 3): set text(size: heading-3-size)

  show link: set text(fill: accent)

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: theme.at("quote-bg"),
      stroke: (left: 3pt + gradient.linear(accent, accent2)),
      inset: (left: 0.8em, right: 0.8em, top: 0.5em, bottom: 0.5em),
      radius: 6pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: panel,
    inset: (x: 3pt, y: 1pt),
    radius: 3pt,
    it,
  )

  show raw.where(block: true): block.with(
    fill: panel,
    inset: 10pt,
    radius: 8pt,
    width: 100%,
    stroke: 0.5pt + panel-border,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: code-size)
  show raw.where(block: true): set par(leading: code-leading)

  set table(
    stroke: (paint: panel-border, thickness: 0.5pt),
    inset: 6pt,
    fill: (x, y) => if y == 0 { theme.at("table-header") } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: accent)

  if title != "" {
    block(width: 100%, inset: (bottom: 0.8em))[
      #set par(leading: title-leading)
      #text(title-size, weight: "black", fill: text-dark, title)
      #if authors.len() > 0 [
        #v(0.2em)
        #text(author-size, fill: text-sub, authors.join(" · "))
      ]
    ]
    line(length: 60%, stroke: 1.5pt + gradient.linear(accent, accent2))
    v(0.6em)
  }

  body
}
