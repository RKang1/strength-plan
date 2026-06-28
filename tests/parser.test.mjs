import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSetsReps, parseWorkoutMarkdown } from '../app.mjs';

test('parseWorkoutMarkdown reads the title and categories', () => {
  const markdown = `# Strength Day

## Main Lower Strength

Sets x Reps: 3-5 x 3-6

- Back Squat
- Front Squat

## Loaded Carry

Sets x Reps: 2-4 trips

- Farmer Carry
`;

  const workout = parseWorkoutMarkdown(markdown, 'strength');

  assert.equal(workout.id, 'strength');
  assert.equal(workout.title, 'Strength Day');
  assert.equal(workout.categories.length, 2);
  assert.deepEqual(workout.categories[0], {
    name: 'Main Lower Strength',
    setsReps: '3-5 x 3-6',
    exercises: ['Back Squat', 'Front Squat'],
  });
  assert.deepEqual(workout.categories[1], {
    name: 'Loaded Carry',
    setsReps: '2-4 trips',
    exercises: ['Farmer Carry'],
  });
});

test('parseWorkoutMarkdown handles empty exercise lists', () => {
  const markdown = `# Athletic Day

## Optional Conditioning

Sets x Reps: 5-10 min
`;

  const workout = parseWorkoutMarkdown(markdown, 'athletic');

  assert.equal(workout.title, 'Athletic Day');
  assert.deepEqual(workout.categories, [
    {
      name: 'Optional Conditioning',
      setsReps: '5-10 min',
      exercises: [],
    },
  ]);
});

test('formatSetsReps makes set and rep ranges explicit', () => {
  assert.equal(formatSetsReps('3-5 x 3-6'), '3-5 sets x 3-6 reps');
});
