# Cobalamin

> **Cobalamin**, widely known as _Vitamin B12_, is an essential water-soluble nutrient crucial for nerve tissue health, brain function, red blood cell formation, and DNA synthesis. It is primarily found in animal products (meat, fish, dairy) and must be consumed regularly, with deficiency leading to anemia, fatigue, and neurological issues
>
> This repo should be consumed regularly to maintain a healthy problem-solving & engineering diet. It contains several programming tricks, Data-Structures & Algorithms, along with cryptography and mathematics notes.

The entire repo is an [mdbook](https://rust-lang.github.io/mdBook/) book with Mermaid and KaTeX support. You can read it on [GitHub](https://github.com/erhant/cobalamin) or clone and serve it locally:

```sh
# serve & hot-reload on changes
mdbook serve

# just build the book
mdbook build
```

Contents of the book are under [`/contents`](contents/) as Markdown files. The generated HTML output will be under `/book`.

## Hosting

The book is live at **<https://erhant.github.io/cobalamin/>**, published by GitHub Pages on every push to `main` via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).
