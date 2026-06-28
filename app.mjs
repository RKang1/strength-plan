const workouts = [
  { id: 'strength', label: 'Strength Day', file: 'strength-day.md' },
  { id: 'athletic', label: 'Athletic Day', file: 'athletic-day.md' },
];

let currentWorkout = null;
let currentCategoryIndex = 0;

export function parseWorkoutMarkdown(markdown, id) {
  const lines = markdown.split(/\r?\n/);
  const titleLine = lines.find((line) => line.startsWith('# '));
  const workout = {
    id,
    title: titleLine ? titleLine.replace(/^#\s+/, '').trim() : 'Workout',
    categories: [],
  };

  let currentCategory = null;
  let currentExerciseGroup = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      currentCategory = {
        name: trimmed.replace(/^##\s+/, '').trim(),
        setsReps: '',
        exercises: [],
      };
      currentExerciseGroup = null;
      workout.categories.push(currentCategory);
      continue;
    }

    if (!currentCategory) {
      continue;
    }

    if (trimmed.startsWith('### ')) {
      currentExerciseGroup = {
        name: trimmed.replace(/^###\s+/, '').trim(),
        exercises: [],
      };

      if (!currentCategory.exerciseGroups) {
        currentCategory.exerciseGroups = [];
      }

      currentCategory.exerciseGroups.push(currentExerciseGroup);
      continue;
    }

    if (trimmed.startsWith('Sets x Reps:')) {
      currentCategory.setsReps = trimmed.replace(/^Sets x Reps:\s*/, '').trim();
      continue;
    }

    if (trimmed.startsWith('- ')) {
      const exercise = trimmed.replace(/^-\s+/, '').trim();

      if (currentExerciseGroup) {
        currentExerciseGroup.exercises.push(exercise);
        continue;
      }

      currentCategory.exercises.push(exercise);
    }
  }

  return workout;
}

export function formatSetsReps(value) {
  const match = value.match(/^(\d+\s*[-–]\s*\d+|\d+)\s*x\s*(\d+\s*[-–]\s*\d+|\d+)$/i);

  if (!match) {
    return value;
  }

  const sets = match[1].replace(/\s*[-–]\s*/g, '-');
  const reps = match[2].replace(/\s*[-–]\s*/g, '-');
  return `${sets} sets x ${reps} reps`;
}

export function slugifyCategory(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveCategoryIndex(categories, categorySlug) {
  if (!categorySlug) {
    return 0;
  }

  const index = categories.findIndex((category) => slugifyCategory(category.name) === categorySlug);
  return index >= 0 ? index : 0;
}

export function getUrlState(windowLike = globalThis.window) {
  if (!windowLike?.location) {
    return {
      day: '',
      category: '',
    };
  }

  const params = new URLSearchParams(windowLike.location.search);
  return {
    day: params.get('day') || '',
    category: params.get('category') || '',
  };
}

export function getInitialWorkoutState(search = globalThis.window?.location?.search || '') {
  const params = new URLSearchParams(search);
  const requestedDay = params.get('day') || '';
  const day = workouts.some((workout) => workout.id === requestedDay) ? requestedDay : workouts[0].id;

  return {
    day,
    category: params.get('category') || '',
  };
}

export function buildWorkoutUrl(currentUrl, day, categorySlug) {
  const url = new URL(currentUrl);
  url.searchParams.set('day', day);

  if (categorySlug) {
    url.searchParams.set('category', categorySlug);
  } else {
    url.searchParams.delete('category');
  }

  return url.toString();
}

async function loadWorkout(workoutId, requestedCategorySlug = '') {
  const workoutMeta = workouts.find((workout) => workout.id === workoutId) || workouts[0];
  showLoading();

  try {
    const response = await fetch(workoutMeta.file);

    if (!response.ok) {
      throw new Error(`Could not load ${workoutMeta.file}`);
    }

    const markdown = await response.text();
    currentWorkout = parseWorkoutMarkdown(markdown, workoutMeta.id);
    currentCategoryIndex = resolveCategoryIndex(currentWorkout.categories, requestedCategorySlug);
    updateUrlState();
    render();
  } catch (error) {
    showError(error.message);
  }
}

function showLoading() {
  const categoryList = document.querySelector('[data-category-list]');
  const details = document.querySelector('[data-category-details]');

  if (categoryList) {
    categoryList.innerHTML = '<p class="muted">Loading workout...</p>';
  }

  if (details) {
    details.innerHTML = '';
  }
}

function showError(message) {
  const categoryList = document.querySelector('[data-category-list]');
  const details = document.querySelector('[data-category-details]');

  if (categoryList) {
    categoryList.innerHTML = '';
  }

  if (details) {
    details.innerHTML = `<div class="empty-state"><h2>Unable to load workout</h2><p>${escapeHtml(message)}</p></div>`;
  }
}

function render() {
  renderDaySelector();
  renderCategoryList();
  renderCategoryDetails();
}

function updateUrlState() {
  if (!globalThis.window?.history || !currentWorkout) {
    return;
  }

  const category = currentWorkout.categories[currentCategoryIndex];
  const categorySlug = category ? slugifyCategory(category.name) : '';
  const nextUrl = buildWorkoutUrl(globalThis.window.location.href, currentWorkout.id, categorySlug);
  globalThis.window.history.replaceState({}, '', nextUrl);
}

function renderDaySelector() {
  const container = document.querySelector('[data-day-selector]');

  if (!container || !currentWorkout) {
    return;
  }

  container.innerHTML = workouts
    .map((workout) => {
      const isActive = workout.id === currentWorkout.id;
      return `<button class="segmented-button${isActive ? ' is-active' : ''}" type="button" data-day="${workout.id}" aria-pressed="${isActive}">${workout.label}</button>`;
    })
    .join('');

  container.querySelectorAll('[data-day]').forEach((button) => {
    button.addEventListener('click', () => loadWorkout(button.dataset.day));
  });
}

function renderCategoryList() {
  const container = document.querySelector('[data-category-list]');

  if (!container || !currentWorkout) {
    return;
  }

  container.innerHTML = currentWorkout.categories
    .map((category, index) => {
      const isActive = index === currentCategoryIndex;
      return `<button class="category-button${isActive ? ' is-active' : ''}" type="button" data-category-index="${index}" aria-pressed="${isActive}">
        <span>${escapeHtml(category.name)}</span>
        <small>${escapeHtml(category.setsReps ? formatSetsReps(category.setsReps) : 'No sets listed')}</small>
      </button>`;
    })
    .join('');

  container.querySelectorAll('[data-category-index]').forEach((button) => {
    button.addEventListener('click', () => {
      currentCategoryIndex = Number(button.dataset.categoryIndex);
      updateUrlState();
      renderCategoryList();
      renderCategoryDetails();
    });
  });
}

function renderCategoryDetails() {
  const container = document.querySelector('[data-category-details]');

  if (!container || !currentWorkout) {
    return;
  }

  const category = currentWorkout.categories[currentCategoryIndex];

  if (!category) {
    container.innerHTML = '<div class="empty-state"><h2>No categories found</h2><p>Add categories to the selected Markdown file.</p></div>';
    return;
  }

  const exercises = renderExercises(category);

  container.innerHTML = `<section class="details-panel">
    <p class="eyebrow">${escapeHtml(currentWorkout.title)}</p>
    <h2>${escapeHtml(category.name)}</h2>
    <p class="sets-reps">${escapeHtml(category.setsReps ? formatSetsReps(category.setsReps) : 'No sets listed')}</p>
    ${exercises}
  </section>`;
}

function renderExercises(category) {
  if (category.exerciseGroups?.length) {
    return `<div class="exercise-groups">${category.exerciseGroups.map(renderExerciseGroup).join('')}</div>`;
  }

  if (category.exercises.length) {
    return renderExerciseList(category.exercises);
  }

  return '<p class="muted">No exercises listed for this category.</p>';
}

function renderExerciseGroup(group) {
  return `<section class="exercise-group">
    <h3>${escapeHtml(group.name)}</h3>
    ${renderExerciseList(group.exercises)}
  </section>`;
}

function renderExerciseList(exercises) {
  return `<ul class="exercise-list">${exercises.map((exercise) => `<li>${escapeHtml(exercise)}</li>`).join('')}</ul>`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

if (typeof document !== 'undefined') {
  const initialState = getInitialWorkoutState();
  loadWorkout(initialState.day, initialState.category);
}
