# Strength Plan

A simple static workout browser for GitHub Pages.

## Edit The Workouts

Workout data lives in Markdown:

- `day-1.md`
- `day-2.md`

Each `##` heading is a phase (Warm-Up / Athletic / Strength / Cool-Down). Under a
phase, each `###` heading is a category — add a `Sets x Reps:` line and bullet
exercises beneath it. An optional `####` heading groups exercises within a category.

## How The Plan Is Meant To Be Read

Work through the categories **top down**, picking **one exercise** from each. The
`Sets x Reps` line is the dose for that single pick. Where a category has `####`
sub-groups, the sets are the total across the whole category — one set from each
sub-group, or three from one.

Because a category is a menu of alternatives, listing the same exercise in two
working categories means it can be drawn twice in one session. `tests/content.test.mjs`
guards against that for the Athletic and Strength phases.

## Run Locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Test

```bash
node --test
```
