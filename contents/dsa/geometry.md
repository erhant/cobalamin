# Geometry

Almost every 2D problem reduces to one primitive: the **cross product**. It answers "which side of a line is this point on?", and orientation tests, segment intersection, polygon area, and convex hulls are all built from it.

Points are `[x, y]` tuples. Keep coordinates **integral** whenever the input allows. Cross products of integer points are exact, while floats need an $\varepsilon$ in every comparison and still break on near-degenerate input. With coordinates up to $10^9$, products reach $10^{18}$, which is past `Number.MAX_SAFE_INTEGER` ($\approx 9 \cdot 10^{15}$). Switch to `bigint` there.

```typescript
type P = [number, number];
```

## Cross Product & Orientation

For vectors $\vec{a} = (a_x, a_y)$ and $\vec{b} = (b_x, b_y)$:

$$
\vec{a} \times \vec{b} = a_x b_y - a_y b_x = |\vec{a}||\vec{b}| \sin\theta
$$

The sign is the turn direction from $\vec{a}$ to $\vec{b}$. Applied to $\vec{OA}$ and $\vec{OB}$:

- $> 0$: $O \to A \to B$ turns **counter-clockwise** (left).
- $< 0$: turns **clockwise** (right).
- $= 0$: the three points are **collinear**.

```typescript
// cross product of OA and OB
function cross(o: P, a: P, b: P): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
```

The magnitude is the area of the parallelogram spanned by the two vectors, so the area of triangle $OAB$ is $|\text{cross}| / 2$.

The **dot product** $a_x b_x + a_y b_y = |\vec{a}||\vec{b}|\cos\theta$ is its partner: its sign says whether the angle is acute ($>0$), right ($=0$), or obtuse ($<0$).

> [!TIP]
> [1232 Check If It Is a Straight Line](https://leetcode.com/problems/check-if-it-is-a-straight-line/) · [1037 Valid Boomerang](https://leetcode.com/problems/valid-boomerang/) · [149 Max Points on a Line](https://leetcode.com/problems/max-points-on-a-line/)

For "max points on a line", don't hash slopes as floats. Hash the reduced direction `(dx / g, dy / g)` with $g = \gcd(dx, dy)$, and fix the sign so that $(1, -2)$ and $(-1, 2)$ map to the same key.

## Segment Intersection

Segments $AB$ and $CD$ intersect iff each one **straddles** the other's line, meaning $C$ and $D$ lie on opposite sides of $AB$ and $A$ and $B$ lie on opposite sides of $CD$. The collinear cases (a zero cross product) need a separate bounding-box check.

```typescript
// q is collinear with segment pr; is it within its bounding box?
function onSegment(p: P, q: P, r: P): boolean {
  return (
    Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) &&
    Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1])
  );
}

function intersects(a: P, b: P, c: P, d: P): boolean {
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  // proper crossing: strict opposite signs on both sides
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  // touching / overlapping: an endpoint lies on the other segment
  return (
    (d1 === 0 && onSegment(a, c, b)) ||
    (d2 === 0 && onSegment(a, d, b)) ||
    (d3 === 0 && onSegment(c, a, d)) ||
    (d4 === 0 && onSegment(c, b, d))
  );
}
```

Compare signs explicitly instead of testing `d1 * d2 < 0`, because the product can overflow even when each factor fits.

## Polygon Area (Shoelace)

For a simple polygon with vertices $p_0, \dots, p_{n-1}$ in order:

$$
A = \frac{1}{2} \left| \sum_{i=0}^{n-1} (x_i\, y_{i+1} - x_{i+1}\, y_i) \right|, \quad p_n = p_0
$$

Each term is the cross product of consecutive vertices measured from the origin: a signed triangle that adds or cancels out. Without the absolute value, the sign gives the winding direction: positive means counter-clockwise.

```typescript
function area2(poly: P[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  // twice the signed area, which stays an integer for integer input
  return s;
}
```

**Pick's theorem** links area to lattice points for integer polygons: $A = I + B/2 - 1$, where $I$ counts interior points and $B$ counts boundary points. Edge $(dx, dy)$ contributes $\gcd(|dx|, |dy|)$ boundary points.

> [!TIP]
> [812 Largest Triangle Area](https://leetcode.com/problems/largest-triangle-area/)

## Convex Hull (Monotone Chain)

Andrew's algorithm runs in $O(n \log n)$. Sort the points by $(x, y)$, then build the lower hull left-to-right and the upper hull right-to-left. Both use the same stack rule: pop while the last two points and the new one **don't turn left**. It's a monotonic stack where the invariant is convexity instead of order.

```typescript
function convexHull(pts: P[]): P[] {
  pts = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const hull: P[] = [];
  // lower hull, then upper hull
  for (const pass of [pts, [...pts].reverse()]) {
    const start = hull.length;
    for (const p of pass) {
      // `<= 0` drops collinear points; use `< 0` to keep them
      while (hull.length >= start + 2 &&
             cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
        hull.pop();
      }
      hull.push(p);
    }
    // the last point of each pass is the first of the next
    hull.pop();
  }
  return hull;
}
```

The output is counter-clockwise, starting from the lowest-leftmost point.

Edge cases:

- **Duplicate points** break the turn test. Dedupe them first.
- **Keeping collinear boundary points** (`< 0`) fails when _all_ points are collinear: both passes emit the same points, so each one appears twice. Dedupe the result in that case.
- The **diameter** (farthest pair) of a point set is attained on its hull. Rotating calipers finds it in $O(h)$ after the hull is built.

> [!TIP]
> [587 Erect the Fence](https://leetcode.com/problems/erect-the-fence/)

## Point in Polygon

**Ray casting**: shoot a horizontal ray from the query point to $+\infty$ and count edge crossings. An odd count means inside. The half-open test `(yi > y) !== (yj > y)` counts a vertex sitting exactly on the ray once rather than twice.

```typescript
function inside(poly: P[], [x, y]: P): boolean {
  let res = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    // edge spans the ray's y, and the crossing is to the right of x
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      res = !res;
    }
  }
  return res;
}
```

Points exactly on the boundary are ambiguous here. If they matter, check `cross(...) === 0 && onSegment(...)` against each edge first. For a **convex** polygon, an $O(\log n)$ test exists: binary search the fan of triangles around $p_0$ by cross-product sign.

## Distance Tricks

- **Compare squared distances.** Skip `Math.sqrt` because it's slower and introduces floats.
- **Manhattan → Chebyshev.** Rotate with $u = x + y$, $v = x - y$. Then $|x_1 - x_2| + |y_1 - y_2| = \max(|u_1 - u_2|, |v_1 - v_2|)$. The max Manhattan distance between any pair becomes $\max(\max u - \min u,\ \max v - \min v)$, which is $O(n)$ with no pairwise loop.

> [!TIP]
> [1131 Maximum of Absolute Value Expression](https://leetcode.com/problems/maximum-of-absolute-value-expression/) · [3102 Minimize Manhattan Distances](https://leetcode.com/problems/minimize-manhattan-distances/) · [973 K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/)
