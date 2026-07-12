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
  renderPhaseListHtml,
  resolveCategoryIndex,
  resolvePhaseIndex,
  slugifyCategory,
} from '../app.mjs';

test('parseWorkoutMarkdown reads the title and nests categories under phases', () => {
  const markdown = `# Day 1 · Power

## Strength

### Main Lower Strength

Sets x Reps: 3-5 x 3-6

- Back Squat
- Front Squat

### Loaded Carry

Sets x Reps: 2-4 trips

- Farmer Carry

## Cool-Down

### Optional Conditioning

Sets x Reps: 5-10 min
`;

  const workout = parseWorkoutMarkdown(markdown, 'day1');

  assert.equal(workout.id, 'day1');
  assert.equal(workout.title, 'Day 1 · Power');
  assert.equal(workout.phases.length, 2);
  assert.equal(workout.phases[0].name, 'Strength');
  assert.deepEqual(workout.phases[0].categories[0], {
    name: 'Main Lower Strength',
    setsReps: '3-5 x 3-6',
    exercises: ['Back Squat', 'Front Squat'],
  });
  assert.deepEqual(workout.phases[0].categories[1], {
    name: 'Loaded Carry',
    setsReps: '2-4 trips',
    exercises: ['Farmer Carry'],
  });
  assert.equal(workout.phases[1].name, 'Cool-Down');
});

test('parseWorkoutMarkdown handles categories with empty exercise lists', () => {
  const markdown = `# Day 1 · Power

## Cool-Down

### Optional Conditioning

Sets x Reps: 5-10 min
`;

  const workout = parseWorkoutMarkdown(markdown, 'day1');

  assert.equal(workout.phases.length, 1);
  assert.deepEqual(workout.phases[0].categories, [
    {
      name: 'Optional Conditioning',
      setsReps: '5-10 min',
      exercises: [],
    },
  ]);
});

test('parseWorkoutMarkdown preserves grouped exercises within a category', () => {
  const markdown = `# Day 1 · Power

## Cool-Down

### Prehab / Mobility

Sets x Reps: 2-3 x 10-20

#### Shoulder Health

- Face Pull
- Band Pull-apart

#### Hip / Groin

- Copenhagen Plank
- Cossack Squat
`;

  const workout = parseWorkoutMarkdown(markdown, 'day1');

  assert.deepEqual(workout.phases[0].categories[0], {
    name: 'Prehab / Mobility',
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

test('getUrlState reads day, phase, and category from URL-like objects', () => {
  const state = getUrlState({
    location: { search: '?day=day2&phase=strength&category=upper-pull' },
  });

  assert.deepEqual(state, { day: 'day2', phase: 'strength', category: 'upper-pull' });
});

test('getUrlState returns empty values outside browser-like environments', () => {
  assert.deepEqual(getUrlState(undefined), { day: '', phase: '', category: '' });
});

test('getInitialWorkoutState validates day while preserving phase and category', () => {
  assert.deepEqual(
    getInitialWorkoutState('?day=day2&phase=strength&category=upper-pull'),
    { day: 'day2', phase: 'strength', category: 'upper-pull' },
  );

  assert.deepEqual(
    getInitialWorkoutState('?day=missing&phase=strength&category=upper-pull'),
    { day: 'day1', phase: 'strength', category: 'upper-pull' },
  );
});

test('buildWorkoutUrl writes day, phase, and category query params', () => {
  assert.equal(
    buildWorkoutUrl('http://localhost:8000/?day=day1&phase=athletic&category=jump-landing', 'day2', 'strength', 'upper-pull'),
    'http://localhost:8000/?day=day2&phase=strength&category=upper-pull',
  );
});

test('buildWorkoutUrl drops category when no phase is open', () => {
  assert.equal(
    buildWorkoutUrl('http://localhost:8000/?day=day1&phase=athletic&category=jump-landing', 'day1', '', 'upper-pull'),
    'http://localhost:8000/?day=day1',
  );
});

test('resolvePhaseIndex finds phases by slug and defaults to none selected', () => {
  const phases = [{ name: 'Athletic' }, { name: 'Strength' }, { name: 'Cool-Down' }];

  assert.equal(resolvePhaseIndex(phases, 'strength'), 1);
  assert.equal(resolvePhaseIndex(phases, 'cool-down'), 2);
  assert.equal(resolvePhaseIndex(phases, 'missing'), -1);
  assert.equal(resolvePhaseIndex(phases, ''), -1);
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

test('renderPhaseListHtml expands only the active phase and its active category', () => {
  const phases = [
    {
      name: 'Athletic',
      categories: [
        { name: 'Jump / Landing', setsReps: '3-5 x 3-5', exercises: ['Box Jump'] },
      ],
    },
    {
      name: 'Strength',
      categories: [
        { name: 'Upper Pull', setsReps: '3-4 x 4-8', exercises: ['Pull-ups'] },
        { name: 'Loaded Carry', setsReps: '2-4 trips', exercises: ['Farmer Carry'] },
      ],
    },
  ];

  const html = renderPhaseListHtml(phases, 1, 0);

  assert.match(html, /data-phase-index="0"[^>]*aria-expanded="false"/);
  assert.match(html, /data-phase-index="1"[^>]*aria-expanded="true"/);
  assert.doesNotMatch(html, /Jump \/ Landing/);
  assert.match(html, /Pull-ups/);
  assert.doesNotMatch(html, /Farmer Carry/);
});

test('renderPhaseListHtml keeps every phase collapsed without an active phase', () => {
  const phases = [
    {
      name: 'Athletic',
      categories: [
        { name: 'Jump / Landing', setsReps: '3-5 x 3-5', exercises: ['Box Jump'] },
      ],
    },
  ];

  const html = renderPhaseListHtml(phases, -1, -1);

  assert.doesNotMatch(html, /aria-expanded="true"/);
  assert.doesNotMatch(html, /Box Jump/);
});
