import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseWorkoutMarkdown } from '../app.mjs';

async function loadWorkoutFile(file, id) {
  const markdown = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  return parseWorkoutMarkdown(markdown, id);
}

test('day-1.md is a Power day with Warm-Up, Athletic, Strength, and Cool-Down phases', async () => {
  const workout = await loadWorkoutFile('day-1.md', 'day1');

  assert.equal(workout.title, 'Day 1 · Power');
  assert.deepEqual(
    workout.phases.map((phase) => phase.name),
    ['Warm-Up', 'Athletic', 'Strength', 'Cool-Down'],
  );
  for (const phase of workout.phases) {
    assert.ok(phase.categories.length > 0, `${phase.name} should have categories`);
  }
});

test('day-2.md is a Strength day with Warm-Up, Athletic, Strength, and Cool-Down phases', async () => {
  const workout = await loadWorkoutFile('day-2.md', 'day2');

  assert.equal(workout.title, 'Day 2 · Strength');
  assert.deepEqual(
    workout.phases.map((phase) => phase.name),
    ['Warm-Up', 'Athletic', 'Strength', 'Cool-Down'],
  );
  for (const phase of workout.phases) {
    assert.ok(phase.categories.length > 0, `${phase.name} should have categories`);
  }
});

function collectExercises(category) {
  const grouped = (category.exerciseGroups ?? []).flatMap((group) => group.exercises);
  return [...category.exercises, ...grouped];
}

// One exercise is picked per category, top down, so an exercise listed in two
// working categories can be drawn twice in a single session. Warm-Up and
// Cool-Down are exempt: they deliberately reuse drills at a lighter dose.
for (const [file, id] of [
  ['day-1.md', 'day1'],
  ['day-2.md', 'day2'],
]) {
  test(`${file} never lists the same exercise in two working categories`, async () => {
    const workout = await loadWorkoutFile(file, id);
    const working = workout.phases.filter((phase) => phase.name === 'Athletic' || phase.name === 'Strength');
    const seen = new Map();

    for (const phase of working) {
      for (const category of phase.categories) {
        for (const exercise of collectExercises(category)) {
          assert.equal(
            seen.has(exercise),
            false,
            `${exercise} is in both "${seen.get(exercise)}" and "${category.name}"`,
          );
          seen.set(exercise, category.name);
        }
      }
    }
  });
}

test('cool-down mobility keeps its exercise sub-groups', async () => {
  const workout = await loadWorkoutFile('day-1.md', 'day1');
  const coolDown = workout.phases.find((phase) => phase.name === 'Cool-Down');
  const mobility = coolDown.categories.find((category) => category.name === 'Prehab / Mobility');

  assert.deepEqual(
    mobility.exerciseGroups.map((group) => group.name),
    ['Shoulder Health', 'Hip / Groin', 'Neck'],
  );
});
