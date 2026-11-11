// generates vendor/sigils.css (pixel sigils for the sidebar and page titles): `node vendor/sigils.js`
// grids: `#` = solid pixel, `+` = dim pixel, anything else = empty; at most 12x12
// pure CSS so the icons are there on first paint, no JS flash
const fs = require("fs");
const path = require("path");

const SIGILS = {
  intro: `
....++++....
..+......+..
.+...##...+.
.+........+.
+...####...+
+.#.####.#.+
+.#.####.#.+
+...####...+
.+........+.
.+...##...+.
..+......+..
....++++....`,

  "dsa/sorting": `
..........##
..........##
.......##.##
.......##.##
.......##.##
....##.##.##
....##.##.##
.##.##.##.##
.##.##.##.##`,
  "dsa/binary-search": `
++++++++++++
++++++++++++
............
......++++++
......++++++
............
......+++...
......+++...
............
.......#....
.......#....`,
  "dsa/two-pointers": `
#..........#
##........##
###......###
##........##
#..........#
............
++++++++++++
++++++++++++`,
  "dsa/prefix-diff": `
.........###
.........#++
......####++
......#+++++
...####+++++
...#++++++++
####++++++++`,
  "dsa/monotonic-stack-queue": `
...++++++...
............
#...####...#
#..######..#
#.########.#
############`,
  "dsa/in-place-arrays": `
..+++++++..
.+.......+.
+++.....+++
##.++.++.##
##.++.++.##`,
  "dsa/backtracking": `
.....##.....
.....##.....
....#..+....
...#....+...
..##....++..
..##....++..
..#......+..
..#......+..
.###....+.+.
.###.....+..
.###....+.+.`,

  "dsa/dp": `
##.##.##.##
##.##.##.##
...........
##.##.##.++
##.##.##.++
...........
##.++.++.++
##.++.++.++
...........
++.++.++.++
++.++.++.++`,
  "dsa/dp-1d": `
....++++++.
....+....+.
....+..+++.
....+..+.+.
++.##.##.##
++.##.##.##`,
  "dsa/dp-2d": `
++.++.++.++
++.++.++.++
...........
++.++.##.++
++.++.##.++
......##...
++.#####.++
++.#####.++
...........
++.++.++.++
++.++.++.++`,
  "dsa/dp-interval": `
##.++.++.##
##.++.++.##
...........
...##.++.++
...##.++.++
...........
......##.++
......##.++
...........
.........##
.........##`,
  "dsa/dp-bitmask": `
++.++.++.##
...........
++.++.##.++
...........
++.++.##.##
...........
++.##.++.++`,
  "dsa/dp-digit": `
.+++...###.
+...+.#...#
+..++.#...#
+.+.+..####
++..+.....#
+...+....#.
.+++...##..`,

  "dsa/linked-lists": `
##...##...##
##..+##..+##
##+++##+++##
##..+##..+##
##...##...##`,
  "dsa/heap": `
....####....
....####....
............
..+++..+++..
..+++..+++..
............
+++.++++.+++
+++.++++.+++`,
  "dsa/union-find": `
#....##....#
.+...++...+.
..+..++..+..
...+.++.+...
....####....
##++####++##
##++####++##
....####....
...+.++.+...
..+..++..+..
.+...++...+.
#....##....#`,
  "dsa/range-queries": `
............
......#.....
..+...#.#...
..+.#.#.#...
..+.#.#.#.+.
+.+.#.#.#.+.
+.+.#.#.#.+.
............
....#####...`,
  "dsa/segment-tree": `
+++++++++++
+++++++++++
...........
+++++.#####
+++++.#####
...........
++.##.++.++
++.##.++.++`,
  "dsa/fenwick-tree": `
++++++++
++++++++
........
####....
####....
........
++..##..
++..##..
........
+.+.+.#.
+.+.+.#.`,
  "dsa/sparse-table": `
++++++......
.######.....
..++++++....
...++++++...
....++++++..
.....######.
......++++++`,
  "dsa/sqrt-decomposition": `
....########
....#.......
...#.++.++..
#..#.++.++..
.##.........
..#.........`,

  "dsa/binary-trees": `
.....##.....
.....##.....
....+..+....
...+....+...
..##....##..
..##....##..
.+..+..+..+.
.#..#..#..#.`,
  "dsa/graphs": `
.....##.....
.....##.....
....+..+....
...+....+...
..+......+..
##++++++++##
##........##
..+......+..
...+....+...
....+..+....
.....##.....
.....##.....`,
  "dsa/graph-representations": `
++.##.##.++
++.##.##.++
...........
##.++.##.##
##.++.##.##
...........
##.##.++.##
##.##.++.##
...........
++.##.##.++
++.##.##.++`,
  "dsa/shortest-paths": `
##++++++++##
##........##
+.#........+
+..#.......+
+...#......+
+....##....+
+....##....+
+......#...+
+.......#..+
+........#.+
##........##
##++++++++##`,
  "dsa/mst": `
.....##.....
.....##.....
....#..+....
...#....+...
..#......+..
##++++++++##
##........##
..#......#..
...#....#...
....#..#....
.....##.....
.....##.....`,
  "dsa/binary-lifting": `
##+++++++++
##........+
..........+
##++++++..+
##.....+..+
.......+..+
##+++..+..+
##..+..+..+
....+..+..+
##..+..+..+
##+++++++++`,
  "dsa/tree-flattening": `
....###....
...+...+...
..+.....+..
.###...###.
...........
....###....
.....#.....
...........
###.###.###`,

  "dsa/heavy-light-decomposition": `
.....##.....
.....##.....
....#..+....
...#....+...
..##....##..
..##....##..
.#..+....#..
#....+...#..
##..++..##..
##..++..##..`,

  "dsa/strings": `
###.#......
..#.#...###
###.###.#..
#.#.#.#.#..
###.###.###
...........
+++++++++++`,
  "dsa/trie": `
.....##.....
.....##.....
....+..+....
...+....+...
..##....##..
..##....##..
.+..+....+..
+....+...+..
##..##..##..
##..##..##..`,
  "dsa/geometry": `
....####....
...#....#...
..#..+...#..
.#.....+..#.
#....+.....#
.#..+.....#.
..#.+....#..
...#....#...
....####....`,
  "dsa/line-sweep": `
......#.....
.+++..#.....
....######..
......#..++.
..########..
......#.....
++....#.+++.
......#.....`,
  "dsa/bits": `
.#..###..#.
##..#.#.##.
.#..#.#..#.
.#..#.#..#.
###.###.###`,

  "math/arithmetic": `
..#........
..#........
#####.+++++
..#........
..#........
...........
#...#...+..
.#.#.......
..#...+++++
.#.#.......
#...#...+..`,
  "math/primes": `
+.#.#.+.#.+
...........
#.+.+.+.#.+
...........
#.+.+.+.#.+
...........
#.+.+.+.#.+
...........
+.+.+.+.#.+
...........
#.+.+.+.+.+`,
  "math/divisors": `
#...........
+...........
+...........
+...........
+...........
+...........
+#..........
++..........
++#.........
+++#........
+++++#......
+++++++++++#`,
  "math/counting": `
.....#.....
....#.#....
...#.+.#...
..#.#.#.#..
.#.+.+.+.#.
#.#.+.+.#.#`,
  "math/probability": `
.++++++++++.
+..........+
+.##....##.+
+.##....##.+
+..........+
+....##....+
+....##....+
+..........+
+.##....##.+
+.##....##.+
+..........+
.++++++++++.`,

  "cryptography/notations": `
#.....#.++++
#.....#....+
.#...#.....+
.#####..++++
..#.#......+
..#.#......+
...#....++++`,
  "cryptography/asymptotics": `
+..........#
+.........#.
+.........#.
+........#..
+........#..
+.......#...
+......#....
+.....#.....
+....#......
+..##.......
+##.........
++++++++++++`,
  "cryptography/group-theory": `
...++##++...
.##..##..##.
.##......##.
+..........+
+..........+
##........##
##........##
+..........+
+..........+
.##......##.
.##..##..##.
...++##++...`,
  "cryptography/factoring": `
....####....
....####....
....####....
.....++.....
....+..+....
...+....+...
.###....###.
.###....###.
.###....###.`,
  "cryptography/discrete-log": `
.......+.+
........+.
.####..+.+
#....#....
#....#....
#....#....
.#####....
.....#....
#....#....
.####.....`,
  "cryptography/signatures": `
......##....
#.#..#..#...
.#..#....#.#
#.#.......#.
............
++++++++++++`,
  "cryptography/hashing": `
..#...#..
..#...#..
#########
..#...#..
..#...#..
..#...#..
#########
..#...#..
..#...#..`,

  "rust/associated-types-vs-generics": `
..#.###.#..
.#...#...#.
#....#....#
.#...#...#.
..#..#..#..`,
  "rust/copy-vs-clone": `
+++++++...
+.....+...
+.....+...
+..#######
+..#.....#
+..#.....#
+++#.....#
...#.....#
...#.....#
...#######`,
  "rust/lifetimes": `
########
.#....#.
..#++#..
...##...
..#..#..
.#.++.#.
#++++++#
########`,
  "rust/impl-trait-vs-dyn-trait": `
#####..+.+.+
#...#.......
#...#..+...+
#.#.#....#..
#...#..+...+
#...#.......
#####..+.+.+`,
  "rust/interior-mutability": `
+++++++++++
+.........+
+.........+
+..#.#.#..+
+...#.#...+
+..#.#.#..+
+...#.#...+
+..#.#.#..+
+.........+
+.........+
+++++++++++`,
  "rust/global-state": `
...#####...
.##..+..##.
.#...+...#.
#....+....#
#....+....#
#+++++++++#
#....+....#
#....+....#
.#...+...#.
.##..+..##.
...#####...`,
  "rust/ordering-threads": `
+#+++++++++
..#........
...#.......
++++#++++++
.....#.....
......#....
+++++++#+++`,

  "typescript/types": `
++++++++++++
+..........+
+.###.####.+
+..#..#....+
+..#..####.+
+..#.....#.+
+..#..####.+
+..........+
++++++++++++`,
  "typescript/variance": `
....##....
....##....
...+..+...
..+....+..
##......##
##......##
..+....+..
...+..+...
....##....
....##....`,
  "typescript/async": `
...####...
.##....##.
.#..#...#.
#...#....#
#...#....#
#...####.#
#........#
.#......#.
.##....##.
...####...`,
  "typescript/performance": `
.....####
....####.
...####..
..####...
.#######.
...####..
..####...
.####....
.##......
#........`,

  "miscellaneous/pdf": `
######...
#....##..
#....#.#.
#....####
#.......#
#.+++++.#
#.......#
#.+++++.#
#.......#
#.+++...#
#########`,
  "miscellaneous/git": `
##.....
##.....
+.+....
+..+...
+...+..
##...##
##...##
+...+..
+..+...
+.+....
##.....
##.....`,
};

// difficulty marker for DSA pages: 1 = beginner, 2 = intermediate, 3 = advanced
const LEVELS = {
  "dsa/sorting": 1,
  "dsa/binary-search": 1,
  "dsa/two-pointers": 1,
  "dsa/prefix-diff": 1,
  "dsa/monotonic-stack-queue": 2,
  "dsa/in-place-arrays": 2,
  "dsa/backtracking": 2,
  "dsa/dp": 1,
  "dsa/dp-1d": 1,
  "dsa/dp-2d": 2,
  "dsa/dp-interval": 3,
  "dsa/dp-bitmask": 3,
  "dsa/dp-digit": 3,
  "dsa/linked-lists": 1,
  "dsa/heap": 1,
  "dsa/union-find": 2,
  "dsa/range-queries": 2,
  "dsa/segment-tree": 3,
  "dsa/fenwick-tree": 2,
  "dsa/sparse-table": 3,
  "dsa/sqrt-decomposition": 3,
  "dsa/binary-trees": 1,
  "dsa/graphs": 1,
  "dsa/graph-representations": 1,
  "dsa/shortest-paths": 2,
  "dsa/mst": 2,
  "dsa/binary-lifting": 3,
  "dsa/tree-flattening": 3,
  "dsa/heavy-light-decomposition": 3,
  "dsa/strings": 2,
  "dsa/trie": 2,
  "dsa/geometry": 2,
  "dsa/line-sweep": 2,
  "dsa/bits": 1,
};
const LEVEL_NAMES = ["Beginner", "Intermediate", "Advanced"];
const LEVEL_COLORS = ["#2f9e44", "#f08c00", "#e03131"];

// one color per sidebar group; a group starts at every part title and `---` spacer in SUMMARY.md
const PALETTE = [
  "#3b5bdb",
  "#e8590c",
  "#2f9e44",
  "#1098ad",
  "#ae3ec9",
  "#d6336c",
  "#1c7ed6",
  "#7048e8",
  "#e03131",
  "#66a80f",
];

// brand colors that override the palette for a whole directory
const DIR_COLORS = { typescript: "#3178c6" };

// fixed px per grid pixel, so every sigil has the same grain
const SIDEBAR_SCALE = 2;
const TITLE_SCALE = 4;
const SIDEBAR_BOX = 12 * SIDEBAR_SCALE;

// one path per tone, each horizontal run of pixels as a 1-tall rectangle
const svgUrl = (rows, color) => {
  const w = Math.max(...rows.map((r) => r.length));
  const runs = { "#": "", "+": "" };
  rows.forEach((row, y) => {
    for (const m of row.matchAll(/#+|\++/g)) runs[m[0][0]] += `M${m.index} ${y}h${m[0].length}v1h-${m[0].length}z`;
  });
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${rows.length}' fill='${color}' shape-rendering='crispEdges'>` +
    `<path d='${runs["#"]}'/><path opacity='.5' d='${runs["+"]}'/></svg>`;
  // only escape what a CSS data URI needs
  return `url("data:image/svg+xml,${svg.replace(/[#<>%"]/g, encodeURIComponent)}")`;
};

// walk SUMMARY.md in order to assign each page its group color
const summary = fs.readFileSync(path.join(__dirname, "../contents/SUMMARY.md"), "utf8");
let group = 0;
const colors = {};
for (const line of summary.split("\n").slice(1)) {
  if (/^# /.test(line) || /^-{3,}\s*$/.test(line)) group++;
  const m = line.match(/\]\(\.\/(.+?)\.md\)/);
  if (m) colors[m[1]] = DIR_COLORS[m[1].split("/")[0]] ?? PALETTE[group % PALETTE.length];
}

const vars = [];
const css = [
  `mdbook-sidebar-scrollbox a::before { display: inline-block; width: ${SIDEBAR_BOX}px; height: ${SIDEBAR_BOX}px; margin-right: 0.5em; vertical-align: middle; background: no-repeat center; image-rendering: pixelated; }`,
  `main h1:first-of-type::before { display: inline-block; margin-right: 0.5em; vertical-align: middle; background: no-repeat center / contain; image-rendering: pixelated; }`,
];
for (const [key, grid] of Object.entries(SIGILS)) {
  if (!colors[key]) throw new Error(`sigil for page not in SUMMARY.md: ${key}`);
  const rows = grid.trim().split("\n");
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const name = `--sigil-${key.replace(/\W/g, "-")}`;
  vars.push(`${name}: ${svgUrl(rows, colors[key])};`);
  const url = `var(${name})`;
  // href is `dsa/heap.html` at the book root, `../dsa/heap.html` elsewhere
  const link = `a[href="${key}.html"], a[href$="/${key}.html"]`;
  css.push(
    `:is(mdbook-sidebar-scrollbox) :is(${link})::before { content: ""; background-image: ${url}; background-size: ${w * SIDEBAR_SCALE}px ${h * SIDEBAR_SCALE}px; }`,
    `html:has(mdbook-sidebar-scrollbox :is(${link}).active) main h1:first-of-type::before { content: ""; background-image: ${url}; width: ${w * TITLE_SCALE}px; height: ${h * TITLE_SCALE}px; }`,
  );
}
// 3 boxes, the first `level` filled, the rest dim outlines
const BOX = 6;
const GAP = 2;
const MARKER_W = 3 * BOX + 2 * GAP;
const markerUrl = (level) => {
  const color = LEVEL_COLORS[level - 1];
  const boxes = [0, 1, 2].map((i) =>
    i < level
      ? `<rect x='${i * (BOX + GAP)}' y='0' width='${BOX}' height='${BOX}' fill='${color}'/>`
      : `<rect x='${i * (BOX + GAP) + 0.5}' y='0.5' width='${BOX - 1}' height='${BOX - 1}' fill='none' stroke='${color}' stroke-opacity='.45'/>`,
  );
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${MARKER_W} ${BOX}' shape-rendering='crispEdges'>${boxes.join("")}</svg>`;
  return `url("data:image/svg+xml,${svg.replace(/[#<>%"]/g, encodeURIComponent)}")`;
};
for (const level of [1, 2, 3]) vars.push(`--level-${level}: ${markerUrl(level)};`);
css.push(
  // the link wrapper is a flex row, so an auto margin pushes the marker to the right edge
  `mdbook-sidebar-scrollbox .chapter-link-wrapper::after { flex: none; align-self: center; width: ${MARKER_W}px; height: ${BOX}px; margin-left: auto; padding-left: 0.5em; background: no-repeat right center; box-sizing: content-box; }`,
  `main h1:first-of-type::after { display: block; margin-top: 0.4em; padding-left: ${MARKER_W * 2 + 10}px; background: no-repeat left center / ${MARKER_W * 2}px ${BOX * 2}px; font-size: 0.4em; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; line-height: ${BOX * 2}px; }`,
);
for (const [key, level] of Object.entries(LEVELS)) {
  if (!colors[key]) throw new Error(`level for page not in SUMMARY.md: ${key}`);
  const link = `a[href="${key}.html"], a[href$="/${key}.html"]`;
  css.push(
    `mdbook-sidebar-scrollbox .chapter-link-wrapper:has(> :is(${link}))::after { content: ""; background-image: var(--level-${level}); }`,
    `html:has(mdbook-sidebar-scrollbox :is(${link}).active) main h1:first-of-type::after { content: "${LEVEL_NAMES[level - 1]}"; background-image: var(--level-${level}); color: ${LEVEL_COLORS[level - 1]}; }`,
  );
}

// hanging indent so wrapped titles line up with the text, not under the icon
const sigilLinks = Object.keys(SIGILS).map((key) => `a[href="${key}.html"], a[href$="/${key}.html"]`);
css.push(
  `mdbook-sidebar-scrollbox :is(${sigilLinks.join(", ")}) { padding-left: calc(${SIDEBAR_BOX}px + 0.5em); text-indent: calc(-${SIDEBAR_BOX}px - 0.5em); }`,
);

fs.writeFileSync(path.join(__dirname, "sigils.css"), `:root {\n  ${vars.join("\n  ")}\n}\n${css.join("\n")}\n`);
