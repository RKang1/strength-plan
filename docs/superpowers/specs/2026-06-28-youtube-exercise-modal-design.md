# YouTube Exercise Modal Design

## Goal

When a user taps an exercise, show an in-app confirmation modal asking whether to view that exercise on YouTube. If the user confirms, open a YouTube search for that exercise. The exercise tiles should keep their current visual appearance.

## User Experience

- Exercise tiles remain visually consistent with the current list items.
- Each exercise tile becomes keyboard and pointer interactive without changing the tile layout.
- Tapping or activating an exercise opens a centered styled modal.
- The modal asks: `View "<exercise>" on YouTube?`
- The modal has two actions:
  - `Cancel`: closes the modal and returns focus to the exercise tile.
  - `YouTube`: opens a YouTube search for the exercise and closes the modal.
- Escape and backdrop click close the modal and return focus.

## Architecture

- Add small exported helpers in `app.mjs`:
  - Build a YouTube search URL from an exercise name.
  - Render exercise tiles as button elements with the existing tile styling.
- Add browser-only modal state in `app.mjs`:
  - Track the selected exercise.
  - Track the trigger element for focus restoration.
  - Render and remove a modal node as needed.
- Keep the feature self-contained in the current static app. No new dependency is required.

## YouTube Launch Behavior

Use `https://www.youtube.com/results?search_query=<encoded exercise>` as the target URL. This works reliably on desktop and mobile browsers, and mobile operating systems can hand the URL off to the YouTube app when available.

The app will call `window.open(url, '_blank', 'noopener')` when the user confirms.

## Styling

- Reuse existing color tokens and the current 8px radius style.
- Preserve the exercise tile look by moving the current `.exercise-list li` visual styles to a reusable selector that also covers the exercise button.
- Add minimal modal, backdrop, and action button styles consistent with the existing quiet workout-browser UI.

## Testing

- Unit test the YouTube URL helper, including space and punctuation encoding.
- Unit test rendered exercise markup to confirm exercises are interactive buttons while preserving the exercise tile class.
- Keep existing parser and URL tests passing.
