// Redbook typography tokens based on Major Second (1.125) modular scale.
// h3 = body size (differentiated by weight), h2 = 1.13em, h1 = 1.27em.
// References: Tailwind CSS, IBM Carbon, Apple HIG compact patterns.

#let resolve-tokens(size: "compact", density: "comfortable") = {
  let body-size = if size == "large" { 11pt } else if size == "regular" { 10.25pt } else { 9.5pt }
  let heading-1-size = 1.27em
  let heading-2-size = 1.13em
  let heading-3-size = 1.0em
  let code-size = 0.85em
  let title-size = 1.38em
  let author-size = if size == "large" { 0.84em } else if size == "regular" { 0.8em } else { 0.76em }

  let paragraph-leading = if density == "tight" { 0.72em } else if density == "relaxed" { 0.88em } else { 0.8em }
  let heading-leading = if density == "tight" { 0.36em } else if density == "relaxed" { 0.44em } else { 0.4em }
  let code-leading = if density == "tight" { 0.45em } else if density == "relaxed" { 0.55em } else { 0.5em }
  let title-leading = if density == "tight" { 0.32em } else if density == "relaxed" { 0.4em } else { 0.36em }
  let paragraph-spacing = if density == "tight" { 0.9em } else if density == "relaxed" { 1.2em } else { 1.0em }
  let heading-above = if density == "tight" { 1.6em } else if density == "relaxed" { 2.0em } else { 1.8em }
  let heading-below = if density == "tight" { 1.0em } else if density == "relaxed" { 1.4em } else { 1.2em }
  let list-spacing = if density == "tight" { 0.5em } else if density == "relaxed" { 0.8em } else { 0.65em }

  (
    "body-size": body-size,
    "heading-1-size": heading-1-size,
    "heading-2-size": heading-2-size,
    "heading-3-size": heading-3-size,
    "code-size": code-size,
    "title-size": title-size,
    "author-size": author-size,
    "paragraph-leading": paragraph-leading,
    "paragraph-spacing": paragraph-spacing,
    "heading-above": heading-above,
    "heading-below": heading-below,
    "heading-leading": heading-leading,
    "code-leading": code-leading,
    "title-leading": title-leading,
    "list-spacing": list-spacing,
  )
}

#let resolve-layout(preset: "redbook-portrait") = {
  if preset == "redbook-portrait" {
    (
      "page-width": 105mm,
      "page-height": 140mm,
    )
  } else if preset == "x-square" {
    (
      "page-width": 108mm,
      "page-height": 108mm,
    )
  } else if preset == "story" {
    (
      "page-width": 108mm,
      "page-height": 192mm,
    )
  } else {
    (
      "page-width": 108mm,
      "page-height": 135mm,
    )
  }
}
