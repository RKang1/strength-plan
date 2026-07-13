import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseWorkoutMarkdown } from '../app.mjs';

async function loadWorkoutFile(file, id) {
  const markdown = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  return parseWorkoutMarkdown(markdown, id);
}

test('day-1.md is a Power day with Athletic, Strength, and Cool-Down phases', async () => {
  const workout = await loadWorkoutFile('day-1.md', 'day1');

  assert.equal(workout.title, 'Day 1 · Power');
  assert.deepEqual(
    workout.phases.map((phase) => phase.name),
    ['Athletic', 'Strength', 'Cool-Down'],
  );
  for (const phase of workout.phases) {
    assert.ok(phase.categories.length > 0, `${phase.name} should have categories`);
  }
});

test('day-2.md is a Strength day with Athletic, Strength, and Cool-Down phases', async () => {
  const workout = await loadWorkoutFile('day-2.md', 'day2');

  assert.equal(workout.title, 'Day 2 · Strength');
  assert.deepEqual(
    workout.phases.map((phase) => phase.name),
    ['Athletic', 'Strength', 'Cool-Down'],
  );
  for (const phase of workout.phases) {
    assert.ok(phase.categories.length > 0, `${phase.name} should have categories`);
  }
});

test('cool-down mobility keeps its exercise sub-groups', async () => {
  const workout = await loadWorkoutFile('day-1.md', 'day1');
  const coolDown = workout.phases.find((phase) => phase.name === 'Cool-Down');
  const mobility = coolDown.categories.find((category) => category.name === 'Prehab / Mobility');

  assert.deepEqual(
    mobility.exerciseGroups.map((group) => group.name),
    ['Shoulder Health', 'Hip / Groin', 'Neck'],
  );
});
