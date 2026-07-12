# Strength Plan

A simple static workout browser for GitHub Pages.

## Edit The Workouts

Workout data lives in Markdown:

- `day-1.md`
- `day-2.md`

Each `##` heading is a phase (Athletic / Strength / Cool-Down). Under a phase,
each `###` heading is a category — add a `Sets x Reps:` line and bullet exercises
beneath it. An optional `####` heading groups exercises within a category.

## Run Locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Test

```bash
node --test
```
