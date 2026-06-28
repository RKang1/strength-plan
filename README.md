# Strength Plan

A simple static workout browser for GitHub Pages.

## Edit The Workouts

Workout data lives in Markdown:

- `strength-day.md`
- `athletic-day.md`

Each `##` heading is a category. Add a `Sets x Reps:` line and bullet exercises under it.

## Run Locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Test

```bash
node --test tests/parser.test.mjs
```
