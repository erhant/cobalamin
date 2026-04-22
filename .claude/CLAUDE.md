# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Personal notes on Data Structures & Algorithms, Math, and Cryptography, authored as an [mdBook](https://rust-lang.github.io/mdBook/). All prose lives in `src/` as Markdown; `book/` is the generated HTML output (gitignored but may be present locally — never edit it by hand).

## Commands

```sh
# serve locally with live reload
mdbook serve

# one-shot build to ./book
mdbook build
```

The build depends on two preprocessors declared in `book.toml`:

- `mdbook-katex` — renders `$...$` / `$$...$$` math.
- `mdbook-mermaid` — renders mermaid diagrams. Custom centering CSS and a pinned `mermaid.min.js` live in `vendor/` and are injected via `additional-css` / `additional-js` in `book.toml`.

If `mdbook serve` fails, first check that both preprocessors are installed (`cargo install mdbook-katex mdbook-mermaid`).

## Adding, renaming, or removing a page

**Always update `src/SUMMARY.md` in the same change.** It is the table of contents mdBook reads to decide what to build — pages not listed there do not appear in the rendered book, and stale entries pointing at renamed/deleted files break the build.

1. Create / rename / delete the `.md` file under the appropriate subdirectory of `src/` (`dsa/`, `math/`, or `cryptography/`).
2. Update the matching entry in `src/SUMMARY.md` under the right top-level section (`# Techniques`, `# Math`, `# Cryptography`) — adjust both the title and the path.

This applies even to small edits: if you rename a page, fix the `SUMMARY.md` link; if you delete one, remove the line.

## Conventions

- Code examples are written in **TypeScript**, even for algorithm/crypto content.
- Math uses KaTeX inline (`$...$`) and display (`$$...$$`) syntax — not MathJax.
- Diagrams use mermaid fenced blocks (```` ```mermaid ````).
- The tone is terse/operational (see existing pages): lead with the idea, then a minimal working snippet, then edge cases or complexity notes. Avoid tutorial-style padding.
