import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkoutUrl,
  buildYoutubeSearchUrl,
  formatSetsReps,
  getInitialWorkoutState,
  getNextCategoryIndex,
  getUrlState,
  parseWorkoutMarkdown,
  renderCategoryListHtml,
  renderExerciseList,
  resolveCategoryIndex,
  slugifyCategory,
} from '../app.mjs';

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

test('parseWorkoutMarkdown preserves grouped exercises within a category', () => {
  const markdown = `# Athletic Day

## Prehab/Mobility

Sets x Reps: 2-3 x 10-20

### Shoulder Health

- Face Pull
- Band Pull-apart

### Hip / Groin

- Copenhagen Plank
- Cossack Squat
`;

  const workout = parseWorkoutMarkdown(markdown, 'athletic');

  assert.deepEqual(workout.categories[0], {
    name: 'Prehab/Mobility',
    setsReps: '2-3 x 10-20',
    exercises: [],
    exerciseGroups: [
      {
        name: 'Shoulder Health',
        exercises: ['Face Pull', 'Band Pull-apart'],
      },
      {
        name: 'Hip / Groin',
        exercises: ['Copenhagen Plank', 'Cossack Squat'],
      },
    ],
  });
});

test('formatSetsReps makes set and rep ranges explicit', () => {
  assert.equal(formatSetsReps('3-5 x 3-6'), '3-5 sets x 3-6 reps');
});

test('slugifyCategory creates stable URL-friendly category ids', () => {
  assert.equal(slugifyCategory('Upper Body Strength'), 'upper-body-strength');
  assert.equal(slugifyCategory('Push / Pull & Carry'), 'push-pull-carry');
  assert.equal(slugifyCategory('  Hip Mobility  '), 'hip-mobility');
});

test('resolveCategoryIndex finds categories by slug and leaves no category selected by default', () => {
  const categories = [
    { name: 'Warm Up' },
    { name: 'Power Development' },
    { name: 'Core / Carries' },
  ];

  assert.equal(resolveCategoryIndex(categories, 'power-development'), 1);
  assert.equal(resolveCategoryIndex(categories, 'core-carries'), 2);
  assert.equal(resolveCategoryIndex(categories, 'missing'), -1);
  assert.equal(resolveCategoryIndex(categories, ''), -1);
});

test('getNextCategoryIndex collapses the active category when selected again', () => {
  assert.equal(getNextCategoryIndex(-1, 1), 1);
  assert.equal(getNextCategoryIndex(1, 1), -1);
  assert.equal(getNextCategoryIndex(1, 0), 0);
});

test('getUrlState reads day and category from URL-like objects', () => {
  const state = getUrlState({
    location: {
      search: '?day=athletic&category=power-development',
    },
  });

  assert.deepEqual(state, {
    day: 'athletic',
    category: 'power-development',
  });
});

test('getUrlState returns empty values outside browser-like environments', () => {
  assert.deepEqual(getUrlState(undefined), {
    day: '',
    category: '',
  });
});

test('getInitialWorkoutState validates day while preserving requested category', () => {
  assert.deepEqual(getInitialWorkoutState('?day=athletic&category=power-development'), {
    day: 'athletic',
    category: 'power-development',
  });

  assert.deepEqual(getInitialWorkoutState('?day=missing&category=power-development'), {
    day: 'strength',
    category: 'power-development',
  });
});

test('buildWorkoutUrl writes day and category query params', () => {
  assert.equal(
    buildWorkoutUrl('http://localhost:8000/?day=strength&category=warm-up', 'athletic', 'power-development'),
    'http://localhost:8000/?day=athletic&category=power-development',
  );
});

test('buildYoutubeSearchUrl creates an encoded YouTube search URL', () => {
  assert.equal(
    buildYoutubeSearchUrl('Trap Bar Deadlift'),
    'https://www.youtube.com/results?search_query=Trap+Bar+Deadlift',
  );

  assert.equal(
    buildYoutubeSearchUrl('Hip / Groin Mobility'),
    'https://www.youtube.com/results?search_query=Hip+%2F+Groin+Mobility',
  );
});

test('renderExerciseList renders exercise tiles as interactive buttons', () => {
  const html = renderExerciseList(['Back Squat', 'Bench Press']);

  assert.match(html, /<ul class="exercise-list">/);
  assert.match(html, /<button class="exercise-tile" type="button" data-exercise="Back Squat">Back Squat<\/button>/);
  assert.match(html, /<button class="exercise-tile" type="button" data-exercise="Bench Press">Bench Press<\/button>/);
});

test('renderExerciseList escapes exercise text and data attributes', () => {
  const html = renderExerciseList(['Push <Press> & "Catch"']);

  assert.match(
    html,
    /data-exercise="Push &lt;Press&gt; &amp; &quot;Catch&quot;">Push &lt;Press&gt; &amp; &quot;Catch&quot;<\/button>/,
  );
});

test('renderCategoryListHtml expands only the active category inline', () => {
  const html = renderCategoryListHtml(
    [
      {
        name: 'Main Lower Strength',
        setsReps: '3-5 x 3-6',
        exercises: ['Back Squat', 'Trap Bar Deadlift'],
      },
      {
        name: 'Main Upper Push',
        setsReps: '3-4 x 4-8',
        exercises: ['Bench Press', 'Push Press'],
      },
    ],
    1,
  );

  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-expanded="true"/);
  assert.doesNotMatch(html, /Back Squat/);
  assert.match(html, /Bench Press/);
  assert.match(html, /3-4 sets x 4-8 reps/);
});

test('renderCategoryListHtml leaves all categories collapsed without an active category', () => {
  const html = renderCategoryListHtml(
    [
      {
        name: 'Main Lower Strength',
        setsReps: '3-5 x 3-6',
        exercises: ['Back Squat', 'Trap Bar Deadlift'],
      },
      {
        name: 'Main Upper Push',
        setsReps: '3-4 x 4-8',
        exercises: ['Bench Press', 'Push Press'],
      },
    ],
    -1,
  );

  assert.doesNotMatch(html, /aria-expanded="true"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /Back Squat/);
  assert.doesNotMatch(html, /Bench Press/);
});
