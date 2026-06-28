# URL Params For Workout And Category

## Goal

Refreshing or sharing the workout browser should preserve both the selected workout day and selected exercise category.

## URL Format

Use query parameters:

```text
?day=athletic&category=power
```

- `day` matches the existing workout ids, such as `strength` or `athletic`.
- `category` is a stable slug derived from the category name in the selected Markdown file.

## Behavior

On initial page load, the app reads `day` and `category` from `window.location.search`.

- If `day` matches a known workout, load that workout.
- If `day` is missing or invalid, load the default workout.
- After the Markdown is parsed, select the category whose name slug matches `category`.
- If `category` is missing or invalid for the loaded workout, select the first category.

When the user changes day:

- Load the selected workout.
- Select that workout's first category.
- Update the URL to the selected `day` and first category slug.

When the user changes category:

- Keep the current workout loaded.
- Select the requested category.
- Update only the `category` query parameter.

Use `history.replaceState` for these UI-driven updates so normal browsing through categories does not fill the browser history stack.

## Implementation Shape

Add small helpers in `app.mjs`:

- Read URL params safely when `window` is available.
- Create category slugs from category names.
- Resolve a category index from a requested slug.
- Replace the current URL params after state changes.

Keep rendering responsibilities unchanged: `renderDaySelector`, `renderCategoryList`, and `renderCategoryDetails` should continue to render from `currentWorkout` and `currentCategoryIndex`.

## Error Handling

Invalid URL values should not show an error. They should fall back to the default day or first category because stale bookmarks should remain usable after Markdown changes.

Fetch failures should continue to use the existing error UI.

## Testing

Add focused unit tests for the pure helpers:

- Category slugs are stable and URL-friendly.
- Known category slugs resolve to the expected index.
- Missing or unknown category slugs resolve to the first category.
- URL param reads return requested values in browser-like environments and defaults outside the browser.
