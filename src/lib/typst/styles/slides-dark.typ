// Slides Dark — dark background, light text, purple accent
// 16:9 landscape (254mm × 142.875mm)

#let article(title: "", authors: (), ..args, body) = {
  let lang = args.at("lang", default: "zh")
  let font-choice = args.at("font", default: "sans")

  let accent = rgb("#A78BFA")
  let text-light = rgb("#F1F5F9")
  let text-sub = rgb("#94A3B8")
  let bg = rgb("#0F172A")
  let panel = rgb("#1E293B")
  let border = rgb("#334155")

  let sans-fonts = ("IBM Plex Sans", "Roboto", "Libertinus Sans", "Noto Sans CJK SC", "Noto Sans SC", "Noto Color Emoji")
  let serif-fonts = ("Libertinus Serif", "Noto Serif SC", "Noto Serif CJK SC", "Noto Color Emoji")
  let body-fonts = if font-choice == "serif" { serif-fonts } else { sans-fonts }
  let heading-fonts = sans-fonts

  set page(
    width: 254mm,
    height: 142.875mm,
    margin: (x: 24mm, top: 20mm, bottom: 22mm),
    fill: bg,
    background: {
      // Top accent gradient bar
      place(top + left,
        rect(width: 254mm, height: 3pt, fill: gradient.linear(accent, rgb("#6366F1")))
      )
    },
    footer: context {
      let pg = counter(page).get().first()
      if pg > 1 {
        align(right, text(9pt, fill: text-sub, str(pg)))
      }
    },
  )
  set document(title: title, author: authors)

  set text(
    font: body-fonts,
    size: 16pt,
    lang: lang,
    fill: text-light,
  )

  set par(
    justify: false,
    leading: 0.75em,
    first-line-indent: 0pt,
    spacing: 0.85em,
  )
  set list(indent: 0.8em, body-indent: 0.5em, spacing: 0.65em, marker: text(fill: accent)[•])
  set enum(indent: 0.8em, body-indent: 0.5em, spacing: 0.65em)

  show heading: it => {
    set text(
      weight: "bold",
      fill: text-light,
      font: heading-fonts,
    )
    set par(leading: 0.5em)
    block(above: 1.2em, below: 0.8em, it)
  }
  show heading.where(level: 1): set text(size: 28pt)
  show heading.where(level: 2): it => {
    block(above: 1.2em, below: 0.8em, {
      stack(dir: ltr, spacing: 0.4em,
        rect(width: 4pt, height: 1em, fill: accent, radius: 2pt),
        text(size: 22pt, weight: "bold", fill: text-light, font: heading-fonts, it.body),
      )
    })
  }
  show heading.where(level: 3): set text(size: 18pt)

  show link: set text(fill: accent)
  show link: underline

  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: panel,
      stroke: (left: 3pt + accent),
      inset: (left: 1em, right: 1em, top: 0.7em, bottom: 0.7em),
      radius: 0pt,
      width: 100%,
      it.body,
    )
  }

  show raw.where(block: false): it => box(
    fill: panel,
    inset: (x: 4pt, y: 2pt),
    radius: 3pt,
    it,
  )

  show raw.where(block: true): block.with(
    fill: panel,
    inset: 14pt,
    radius: 6pt,
    width: 100%,
    stroke: 0.5pt + border,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: 12pt, fill: rgb("#E2E8F0"))
  show raw.where(block: true): set par(leading: 0.55em)

  set table(
    stroke: (paint: border, thickness: 0.5pt),
    inset: 8pt,
    fill: (x, y) => if y == 0 { panel } else { none },
  )
  show table: set par(justify: false, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold")

  // Title slide content
  if title != "" {
    align(horizon, block(width: 100%)[
      #text(36pt, weight: "black", fill: text-light, font: heading-fonts, title)
      #if authors.len() > 0 [
        #v(0.5em)
        #text(14pt, fill: text-sub, authors.join(" · "))
      ]
    ])
    pagebreak()
  }

  body
}
