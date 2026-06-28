import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('index page does not show the old category-picking heading', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /Choose a day, then pick a category\./);
});

test('index page does not show the top-left workout plan label', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /<p class="eyebrow">Workout Plan<\/p>/);
});
