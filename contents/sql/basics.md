# SQL Basics

A table is a bag of rows (a set, unless duplicates are allowed, which they are by default). A query is a declaration of the result you want, not a loop: the engine picks how to compute it. Every query takes tables in and produces a table out, which is why queries nest. Window functions and the classic interview puzzles live in [Interview Patterns](./patterns.md).

## Example schema

Used by every query below. Note: Finn has no department, Legal has no employees, Ada has no manager.

```sql
CREATE TABLE departments (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  salary     INTEGER NOT NULL,
  hired_at   DATE NOT NULL
);
INSERT INTO departments (id, name) VALUES (1, 'Eng'), (2, 'Sales'), (3, 'Legal');
INSERT INTO employees (id, name, dept_id, manager_id, salary, hired_at) VALUES
  (1, 'Ada',  1,    NULL, 200, '2019-03-01'),
  (2, 'Bob',  1,    1,    120, '2021-06-15'),
  (3, 'Cy',   1,    1,    120, '2022-01-10'),
  (4, 'Dee',  2,    1,    90,  '2020-11-20'),
  (5, 'Eve',  2,    4,    70,  '2023-02-01'),
  (6, 'Finn', NULL, 1,    60,  '2024-05-05');
```

## Logical order of evaluation

Written order is `SELECT … FROM … WHERE …`, but clauses are evaluated as:

```text
FROM / JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> DISTINCT -> ORDER BY -> LIMIT / OFFSET
```

So a `SELECT` alias doesn't exist yet when `WHERE` runs: `WHERE annual > 1000` is an error in standard SQL (Postgres, SQL Server); repeat the expression or wrap it in a subquery/CTE. `ORDER BY` runs after `SELECT`, so it _can_ use the alias. Likewise `WHERE` can't reference aggregates; that's what `HAVING` is for. (SQLite accepts the alias in `WHERE` as an extension; don't rely on it.)

## Filtering, sorting, paging

```sql
SELECT name, salary * 12 AS annual
FROM employees
WHERE salary >= 100
ORDER BY annual DESC;
```

| name | annual |
| ---- | ------ |
| Ada  | 2400   |
| Bob  | 1440   |
| Cy   | 1440   |

```sql
SELECT name
FROM employees
WHERE dept_id IN (1, 2)
  AND hired_at BETWEEN '2020-01-01' AND '2022-12-31'
  -- % = any run of chars, _ = exactly one
  AND name LIKE '%e%';
-- Dee
```

- `AND` binds tighter than `OR`; parenthesize mixed conditions.
- `BETWEEN a AND b` is inclusive on both ends.
- NULL tests are `IS NULL` / `IS NOT NULL`, never `= NULL` (see [NULL](#null-semantics)).
- `ORDER BY` default is `ASC`. NULLs sort **first** in SQLite/MySQL/SQL Server and **last** in Postgres/Oracle; force it with `NULLS FIRST` / `NULLS LAST`.
- `LIMIT n OFFSET k` skips `k` rows, then returns `n`. SQL Server uses `SELECT TOP n`; the standard form is `OFFSET k ROWS FETCH FIRST n ROWS ONLY`. Without `ORDER BY`, which rows you get is undefined.
- `SELECT DISTINCT dept_id` dedups whole output rows; it returns `1, 2, NULL` here (NULLs count as equal for `DISTINCT`).

`CASE` is SQL's if/else expression, usable anywhere a value is:

```sql
SELECT name,
  CASE
    WHEN salary >= 150 THEN 'high'
    WHEN salary >= 90 THEN 'mid'
    ELSE 'low'
  END AS band
FROM employees;
-- Ada high, Bob/Cy/Dee mid, Eve/Finn low
```

## Joins

A join pairs rows from two tables that satisfy the `ON` condition. The outer variants additionally keep unmatched rows from one or both sides, padding the other side with NULLs.

```sql
SELECT e.name, d.name AS dept
FROM employees e
-- swap for LEFT / RIGHT / FULL [OUTER] JOIN
JOIN departments d ON d.id = e.dept_id;
```

| e.name | INNER | LEFT  | RIGHT | FULL  |
| ------ | ----- | ----- | ----- | ----- |
| Ada    | Eng   | Eng   | Eng   | Eng   |
| Bob    | Eng   | Eng   | Eng   | Eng   |
| Cy     | Eng   | Eng   | Eng   | Eng   |
| Dee    | Sales | Sales | Sales | Sales |
| Eve    | Sales | Sales | Sales | Sales |
| Finn   | —     | NULL  | —     | NULL  |
| NULL   | —     | —     | Legal | Legal |

- **INNER**: only matches. Finn (no dept) and Legal (no employees) vanish.
- **LEFT**: all employees; Finn gets `dept = NULL`.
- **RIGHT**: all departments; Legal gets `name = NULL`. Same as a LEFT join with the tables swapped, which is how most people write it.
- **FULL OUTER**: both kinds of orphans (not in MySQL; emulate with `LEFT … UNION … RIGHT`).
- **CROSS**: every pair, no `ON`. `employees CROSS JOIN departments` gives 6 × 3 = 18 rows. A join with a forgotten/wrong `ON` is a cross join in disguise.

**Self-join**: the same table under two aliases. Use LEFT so the top of the hierarchy survives:

```sql
SELECT e.name, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;
-- Ada NULL, Bob Ada, Cy Ada, Dee Ada, Eve Dee, Finn Ada
```

**Gotcha: WHERE on the right table kills a LEFT JOIN.** The padded rows have `e.salary = NULL`, and `NULL > 100` is not true, so `WHERE` drops them:

```sql
-- "each department with its well-paid employees" (wrong)
SELECT d.name, e.name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.salary > 100;
-- Eng Ada, Eng Bob, Eng Cy  (Sales and Legal are gone: effectively INNER)

-- right: filter while matching, so unmatched departments are still padded
SELECT d.name, e.name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id AND e.salary > 100;
-- Eng Ada, Eng Bob, Eng Cy, Sales NULL, Legal NULL
```

Rule: conditions on the **preserved** (left) side go in `WHERE`; conditions on the **optional** side go in `ON`. The exception is `WHERE e.id IS NULL`, the anti-join idiom ("departments with no employees").

## Aggregates and GROUP BY

An aggregate collapses many rows into one value. NULLs are skipped by every aggregate except `COUNT(*)`, which counts rows.

```sql
SELECT COUNT(*), COUNT(dept_id), COUNT(DISTINCT dept_id),
       SUM(salary), AVG(salary), MIN(hired_at), MAX(salary)
FROM employees;
```

| COUNT(\*) | COUNT(dept_id) | COUNT(DISTINCT dept_id) | SUM | AVG   | MIN(hired_at) | MAX |
| --------- | -------------- | ----------------------- | --- | ----- | ------------- | --- |
| 6         | 5              | 2                       | 660 | 110.0 | 2019-03-01    | 200 |

`GROUP BY` partitions the rows and runs the aggregates once per group. `WHERE` filters rows **before** grouping; `HAVING` filters groups **after**:

```sql
SELECT dept_id, COUNT(*) AS n, AVG(salary) AS avg_sal
FROM employees
WHERE hired_at >= '2020-01-01'
GROUP BY dept_id
HAVING COUNT(*) >= 2;
```

| dept_id | n   | avg_sal |
| ------- | --- | ------- |
| 1       | 2   | 120.0   |
| 2       | 2   | 80.0    |

- Every column in `SELECT` must be in `GROUP BY` or inside an aggregate. `SELECT dept_id, name … GROUP BY dept_id` is an error in Postgres/SQL Server: which `name` would it show? (SQLite, and MySQL with `ONLY_FULL_GROUP_BY` turned off, silently pick one; MySQL rejects it by default since 5.7.)
- NULL keys form their own group (Finn's `dept_id = NULL` group has `n = 1` without the `WHERE`).
- `AVG` ignores NULLs, so it's `SUM / COUNT(col)`, not `SUM / COUNT(*)`. `COALESCE(col, 0)` first if NULL should count as zero.

## Set operations

Stack the results of two queries vertically. Both sides need the same number of columns with compatible types, matched by **position**, not name.

```sql
SELECT dept_id FROM employees
UNION
SELECT id FROM departments;
-- NULL, 1, 2, 3
```

- `UNION` dedups, which costs a sort or hash; `UNION ALL` just concatenates (here, 9 rows). Use `UNION ALL` unless you need the dedup.
- `INTERSECT`: rows in both. `departments.id INTERSECT employees.dept_id` gives `1, 2`.
- `EXCEPT` (Oracle: `MINUS`): rows in the first but not the second. Gives `3`.

## Subqueries and CTEs

A subquery is a query used as a value. **Scalar** (one row, one column) goes anywhere a value can:

```sql
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
-- Ada 200, Bob 120, Cy 120
```

**IN / EXISTS** test membership. `EXISTS` only checks whether the subquery returns any row:

```sql
-- departments with no employees
SELECT name
FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);
-- Legal
```

**Gotcha: `NOT IN` with a NULL returns nothing.** The same question with `NOT IN`:

```sql
SELECT name FROM departments
WHERE id NOT IN (SELECT dept_id FROM employees);
-- (no rows)
```

`3 NOT IN (1, 2, NULL)` means `3 <> 1 AND 3 <> 2 AND 3 <> NULL`, and the last term is UNKNOWN, so the whole thing is never true. Use `NOT EXISTS`, or add `WHERE dept_id IS NOT NULL` inside the subquery.

The `NOT EXISTS` above is **correlated**: it references `d` from the outer query, so it's logically re-evaluated per outer row. Another one, the top earner per department:

```sql
SELECT name, salary, dept_id
FROM employees e
WHERE salary = (SELECT MAX(salary) FROM employees WHERE dept_id = e.dept_id);
-- Ada 200 1, Dee 90 2
```

Finn drops out because `dept_id = NULL` never matches. Optimizers usually rewrite correlated subqueries into joins, but a naive plan is O(n·m).

A **CTE** (`WITH`) names a subquery so you can read the query top-down and reuse the name:

```sql
WITH dept_avg AS (
  SELECT dept_id, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY dept_id
)
SELECT e.name, e.salary, a.avg_sal
FROM employees e
JOIN dept_avg a ON a.dept_id = e.dept_id
WHERE e.salary > a.avg_sal;
-- Ada 200 146.67, Dee 90 80.0
```

> [!TIP]
> In an interview, first pin down the **grain**: what does one output row represent (one employee? one department? one department per month?). Then build bottom-up with one CTE per step (filter, aggregate, join back, rank) and run each step on its own before composing.

## NULL semantics

NULL means "unknown", so SQL uses three-valued logic: TRUE, FALSE, UNKNOWN. `WHERE` and `ON` keep a row only if the condition is TRUE.

| Expression        | Result  |
| ----------------- | ------- |
| `NULL = NULL`     | UNKNOWN |
| `NULL <> 1`       | UNKNOWN |
| `NULL IS NULL`    | TRUE    |
| `NULL OR TRUE`    | TRUE    |
| `NULL AND FALSE`  | FALSE   |
| `1 + NULL`        | NULL    |

- `WHERE dept_id = NULL` matches 0 rows; use `IS NULL`.
- `WHERE dept_id <> 1` returns 2 rows (Dee, Eve), **not** Finn. Negation doesn't pick up NULLs; add `OR dept_id IS NULL` (or `IS DISTINCT FROM` in Postgres).
- `COALESCE(a, b, …)` returns the first non-NULL argument: `COALESCE(dept_id, 0)`.
- Aggregates skip NULLs (except `COUNT(*)`); `SUM` over zero non-NULL rows is NULL, not 0.

## Writing data

```sql
BEGIN;
INSERT INTO employees (id, name, dept_id, manager_id, salary, hired_at)
VALUES (7, 'Gus', 3, 1, 80, '2025-01-01');
UPDATE employees SET salary = salary + 10 WHERE dept_id = 2;
DELETE FROM employees WHERE dept_id IS NULL;
COMMIT;
```

`UPDATE` / `DELETE` without `WHERE` hit every row. A transaction makes the statements atomic: `COMMIT` applies them all, `ROLLBACK` discards them all (`BEGIN; DELETE FROM employees; ROLLBACK;` leaves the table untouched).

**Keys and indexes.** A `PRIMARY KEY` is unique and non-NULL and identifies a row. A `FOREIGN KEY` (`REFERENCES`) requires the value to exist in the other table (or be NULL), so you can't point at a missing department. `UNIQUE` forbids duplicates but allows NULLs. An index (`CREATE INDEX idx_emp_dept ON employees(dept_id)`) is usually a B-tree over the column(s): it turns `WHERE`, `JOIN ON`, and `ORDER BY` on those columns from a full scan into an O(log n) lookup, at the cost of slower writes and extra storage. Primary keys and unique constraints get one automatically; foreign keys often don't.
