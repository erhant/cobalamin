# Interview Patterns

The same dozen SQL questions come up again and again. Most of them are a window function plus a CTE. Queries were run on SQLite 3.51; anything dialect-specific is called out.

Schema (same as [SQL Basics](./basics.md)), with salary ties at 150 and 100, an empty department, and a `logins` table holding one duplicate row:

```sql
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE employees (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  dept_id INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  salary INTEGER NOT NULL, hired_at DATE NOT NULL
);
CREATE TABLE logins (user_id INTEGER, day DATE);

INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Sales'), (3, 'Marketing');
INSERT INTO employees VALUES
  (1, 'Ada', 1, NULL, 200, '2020-01-15'), (2, 'Bob', 1, 1, 150, '2021-03-01'),
  (3, 'Cy',  1, 1,    150, '2021-06-10'), (4, 'Dee', 1, 2, 160, '2022-02-01'),
  (5, 'Eve', 2, NULL, 120, '2020-05-20'), (6, 'Fay', 2, 5, 130, '2021-09-12'),
  (7, 'Gus', 2, 5,    100, '2023-01-03'), (8, 'Hal', 2, 5, 100, '2023-04-18');
INSERT INTO logins VALUES
  (1, '2026-01-01'), (1, '2026-01-02'), (1, '2026-01-02'), (1, '2026-01-03'),
  (1, '2026-01-05'), (1, '2026-01-06'), (1, '2026-02-01'),
  (2, '2026-01-10'), (2, '2026-01-11'), (2, '2026-02-14'), (2, '2026-02-15'),
  (2, '2026-02-16'), (2, '2026-03-01'), (3, '2026-02-03');
```

## Window Functions

`fn() OVER (PARTITION BY … ORDER BY … frame)` computes a value per row from a "window" of related rows. Unlike `GROUP BY`, **rows are kept, not collapsed**: every input row comes out with the extra column.

```sql
SELECT name, dept_id, salary,
       AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
FROM employees;
```

Each of the 8 rows keeps its own `salary` next to its department's average; `GROUP BY dept_id` would return 2 rows.

- `PARTITION BY` splits rows into independent groups (omit it for one big window).
- `ORDER BY` orders rows inside the partition; ranking and `LAG`/`LEAD` need it.
- The frame (`ROWS`/`RANGE BETWEEN …`) picks which rows an aggregate sees. With `ORDER BY` and no frame, the default is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: a running aggregate.

### Ranking

```sql
SELECT name, salary,
       ROW_NUMBER() OVER w AS row_number,
       RANK()       OVER w AS rank,
       DENSE_RANK() OVER w AS dense_rank
FROM employees
WINDOW w AS (ORDER BY salary DESC);
```

| name | salary | row_number | rank | dense_rank |
| ---- | -----: | ---------: | ---: | ---------: |
| Ada  |    200 |          1 |    1 |          1 |
| Dee  |    160 |          2 |    2 |          2 |
| Bob  |    150 |          3 |    3 |          3 |
| Cy   |    150 |          4 |    3 |          3 |
| Fay  |    130 |          5 |    5 |          4 |
| Eve  |    120 |          6 |    6 |          5 |
| Gus  |    100 |          7 |    7 |          6 |
| Hal  |    100 |          8 |    7 |          6 |

- `ROW_NUMBER`: unique, ties broken arbitrarily (add a tiebreaker column to make it deterministic).
- `RANK`: ties share a rank, then it skips (3, 3, 5).
- `DENSE_RANK`: ties share a rank, no gaps (3, 3, 4).
- `NTILE(4) OVER (ORDER BY salary DESC)` deals rows into 4 near-equal buckets (quartiles); it splits ties across buckets freely.

### LAG / LEAD and Frames

`LAG(col, n, default)` reads the row `n` back (default 1) in window order, `LEAD` reads ahead. Off the edge they return `NULL` (or `default`). See month-over-month below.

`ROWS` counts physical rows; `RANGE` groups peers (equal `ORDER BY` values). That matters with ties:

```sql
SELECT name, salary,
       SUM(salary) OVER (ORDER BY salary) AS range_sum,
       SUM(salary) OVER (ORDER BY salary ROWS UNBOUNDED PRECEDING) AS rows_sum
FROM employees;
```

```text
Gus  100   200   100
Hal  100   200   200
...
Bob  150   750   600
Cy   150   750   750
```

A moving average is `AVG(x) OVER (ORDER BY t ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`.

> [!TIP]
>
> Window functions run **after** `WHERE`, `GROUP BY` and `HAVING`, so `WHERE ROW_NUMBER() OVER (…) = 1` is an error ("misuse of window function"). Compute it in a CTE or subquery, then filter outside. (Snowflake, BigQuery and DuckDB have `QUALIFY` for this; most others don't.)

## Classic Questions

### Nth Highest Salary

```sql
WITH r AS (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT DISTINCT salary FROM r WHERE rnk = 3;
```

```text
150
```

Without windows: `SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 2;` (`OFFSET` is N−1). If there is no Nth salary, both return zero rows; to return `NULL` instead, wrap it as a scalar subquery: `SELECT (SELECT DISTINCT salary … LIMIT 1 OFFSET 9) AS nth_salary;`.

Gotcha: `RANK` or `ROW_NUMBER` give the wrong answer with ties; "3rd highest salary" means the 3rd distinct value, so `DENSE_RANK` (or `DISTINCT` before `OFFSET`).

### Top N per Group

Highest-paid 2 per department:

```sql
WITH r AS (
  SELECT d.name AS dept, e.name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
)
SELECT dept, name, salary FROM r WHERE rnk <= 2 ORDER BY dept, rnk;
```

```text
Engineering  Ada  200
Engineering  Dee  160
Sales        Fay  130
Sales        Eve  120
```

Gotcha: decide on ties. `DENSE_RANK` may return more than N rows per group; `ROW_NUMBER` returns exactly N but drops a tied row arbitrarily.

### Earning More Than Their Manager

Self-join: the same table twice, under two aliases.

```sql
SELECT e.name, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

```text
Dee  160  Bob  150
Fay  130  Eve  120
```

Gotcha: the inner join silently drops employees with no manager (`manager_id IS NULL`), which is what you want here; use `LEFT JOIN` when listing everyone with their manager.

### Departments With No Employees

```sql
-- anti-join via LEFT JOIN
SELECT d.name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.id IS NULL;

-- same thing via NOT EXISTS
SELECT d.name FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);
```

```text
Marketing
```

Gotcha: avoid `WHERE id NOT IN (SELECT dept_id FROM employees)`: one `NULL` `dept_id` makes `NOT IN` return no rows at all. Test a non-nullable column in the `IS NULL` check (the PK), not the join column.

### Duplicates

Find them:

```sql
SELECT user_id, day, COUNT(*) AS n
FROM logins
GROUP BY user_id, day
HAVING COUNT(*) > 1;
```

```text
1  2026-01-02  2
```

Delete all but one, keeping the smallest row id per group:

```sql
DELETE FROM logins
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM logins GROUP BY user_id, day
);
```

Gotcha: you need some unique column to tell copies apart. `rowid` is SQLite's (Postgres: `ctid`); otherwise use the PK, or `ROW_NUMBER() OVER (PARTITION BY user_id, day ORDER BY id)` and delete `rn > 1`. Afterwards add a `UNIQUE (user_id, day)` constraint so it can't happen again.

### Running Total and Month-over-Month

Running total is `SUM` with an `ORDER BY` in the window:

```sql
SELECT name, hired_at, salary,
       SUM(salary) OVER (ORDER BY hired_at) AS payroll
FROM employees;
```

```text
Ada  2020-01-15  200   200
Eve  2020-05-20  120   320
Bob  2021-03-01  150   470
...
Hal  2023-04-18  100  1110
```

Month-over-month: aggregate per month first, then `LAG` over the months:

```sql
WITH m AS (
  SELECT strftime('%Y-%m', day) AS month, COUNT(DISTINCT user_id) AS active
  FROM logins
  GROUP BY month
),
p AS (
  SELECT month, active, LAG(active) OVER (ORDER BY month) AS prev FROM m
)
SELECT month, active, active - prev AS change,
       ROUND(100.0 * (active - prev) / prev, 1) AS pct
FROM p;
```

```text
2026-01  2  NULL  NULL
2026-02  3     1  50.0
2026-03  1    -2 -66.7
```

Gotcha: months with no rows don't exist, so `LAG` silently compares against an older month; join to a calendar of months if gaps are possible. `100.0 *` avoids integer division. Dialects: `strftime('%Y-%m', day)` is SQLite; Postgres `date_trunc('month', day)`, MySQL `DATE_FORMAT(day, '%Y-%m')`.

### Consecutive Days (Gaps and Islands)

In a run of consecutive days, `day` and `ROW_NUMBER()` both go up by 1, so `day − ROW_NUMBER()` is constant within a run and changes at every gap. Group by it.

```sql
WITH d AS (
  SELECT DISTINCT user_id, day FROM logins
),
g AS (
  SELECT user_id, day,
         julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM d
)
SELECT user_id, MIN(day) AS start, MAX(day) AS end, COUNT(*) AS days
FROM g
GROUP BY user_id, grp
HAVING COUNT(*) >= 2;
```

```text
1  2026-01-01  2026-01-03  3
1  2026-01-05  2026-01-06  2
2  2026-01-10  2026-01-11  2
2  2026-02-14  2026-02-16  3
```

Gotcha: dedupe first (`DISTINCT`, or use `DENSE_RANK`); the duplicate 01-02 row otherwise shifts the numbering and produces garbage islands. Date arithmetic: SQLite `julianday(day) - rn`, Postgres `day - rn::int`, MySQL `DATE_SUB(day, INTERVAL rn DAY)`.

### Percentage of Total

`SUM(…) OVER ()` with an empty window is the grand total, available on every row. It works after `GROUP BY` too, hence the nested `SUM(SUM(…))`:

```sql
SELECT d.name AS dept, SUM(e.salary) AS payroll,
       ROUND(100.0 * SUM(e.salary) / SUM(SUM(e.salary)) OVER (), 1) AS pct
FROM employees e
JOIN departments d ON d.id = e.dept_id
GROUP BY d.name;
```

```text
Engineering  660  59.5
Sales        450  40.5
```

Gotcha: integer division (`660 / 1110 = 0`), so multiply by `100.0` first.

### Pivot (Conditional Aggregation)

Turn row values into columns with one `SUM(CASE …)` per column:

```sql
SELECT d.name AS dept,
       SUM(CASE WHEN e.hired_at <  '2021-01-01' THEN 1 ELSE 0 END) AS y2020,
       SUM(CASE WHEN e.hired_at >= '2021-01-01'
                 AND e.hired_at <  '2022-01-01' THEN 1 ELSE 0 END) AS y2021,
       SUM(CASE WHEN e.hired_at >= '2022-01-01' THEN 1 ELSE 0 END) AS y2022_plus
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.name;
```

```text
Engineering  1  2  1
Marketing    0  0  0
Sales        1  1  2
```

Gotcha: columns must be known up front; dynamic pivots need generated SQL. Without `ELSE 0` an all-miss column is `NULL`, not 0. Postgres also has `COUNT(*) FILTER (WHERE …)`.

### Second-Latest Record per User

```sql
WITH r AS (
  SELECT user_id, day,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day DESC) AS rn
  FROM logins
)
SELECT user_id, day FROM r WHERE rn = 2;
```

```text
1  2026-01-06
2  2026-02-16
```

Gotcha: user 3 has a single login and simply disappears; say whether that's wanted or `LEFT JOIN` from the users table. With duplicate timestamps, `ROW_NUMBER` could return the latest again, so dedupe or use `DENSE_RANK`.

## Tips

- **Clarify ties and NULLs first.** "Top 3" with ties, Nth "distinct" salary, whether `NULL` salaries count: ask, or state the choice.
- **State assumptions out loud**: uniqueness, which dialect, whether empty groups should appear.
- **Prefer CTEs** over nested subqueries: one named step per idea, and each one can be run on its own.
- **Check the edge cases** before declaring done: empty groups (`LEFT JOIN` + `COUNT(e.id)`, not `COUNT(*)`), ties, single-row groups, a missing Nth.

> [!TIP]
>
> Most "hard" questions decompose the same way: a CTE that adds a window column (rank, lag, running sum, island key), then a plain `SELECT … WHERE` or `GROUP BY` over it.
