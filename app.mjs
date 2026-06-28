const workouts = [
  { id: 'strength', label: 'Strength Day', file: 'strength-day.md' },
  { id: 'athletic', label: 'Athletic Day', file: 'athletic-day.md' },
];

let currentWorkout = null;
let currentCategoryIndex = -1;

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
    return -1;
  }

  const index = categories.findIndex((category) => slugifyCategory(category.name) === categorySlug);
  return index >= 0 ? index : -1;
}

export function getNextCategoryIndex(currentIndex, selectedIndex) {
  return currentIndex === selectedIndex ? -1 : selectedIndex;
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

export function buildYoutubeSearchUrl(exercise) {
  const params = new URLSearchParams({ search_query: exercise });
  return `https://www.youtube.com/results?${params.toString()}`;
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

  if (categoryList) {
    categoryList.innerHTML = '<p class="muted">Loading workout...</p>';
  }
}

function showError(message) {
  const categoryList = document.querySelector('[data-category-list]');

  if (categoryList) {
    categoryList.innerHTML = `<div class="empty-state"><h2>Unable to load workout</h2><p>${escapeHtml(message)}</p></div>`;
  }
}

function render() {
  renderDaySelector();
  renderCategoryList();
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

  container.innerHTML = renderCategoryListHtml(currentWorkout.categories, currentCategoryIndex);

  container.querySelectorAll('[data-category-index]').forEach((button) => {
    button.addEventListener('click', () => {
      currentCategoryIndex = getNextCategoryIndex(currentCategoryIndex, Number(button.dataset.categoryIndex));
      updateUrlState();
      renderCategoryList();
    });
  });
}

export function renderCategoryListHtml(categories, activeIndex) {
  if (!categories.length) {
    return '<div class="empty-state"><h2>No categories found</h2><p>Add categories to the selected Markdown file.</p></div>';
  }

  return categories
    .map((category, index) => {
      const isActive = index === activeIndex;
      const panelId = `category-panel-${index}`;
      const buttonId = `category-button-${index}`;
      const setsReps = category.setsReps ? formatSetsReps(category.setsReps) : 'No sets listed';

      return `<section class="category-item${isActive ? ' is-active' : ''}">
        <button class="category-button" id="${buttonId}" type="button" data-category-index="${index}" aria-expanded="${isActive}" aria-controls="${panelId}">
          <span>${escapeHtml(category.name)}</span>
          <small>${escapeHtml(setsReps)}</small>
        </button>
        ${isActive ? `<div class="category-panel" id="${panelId}" role="region" aria-labelledby="${buttonId}">
          <p class="sets-reps">${escapeHtml(setsReps)}</p>
          ${renderExercises(category)}
        </div>` : ''}
      </section>`;
    })
    .join('');
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

export function renderExerciseList(exercises) {
  return `<ul class="exercise-list">${exercises
    .map((exercise) => {
      const escapedExercise = escapeHtml(exercise);
      return `<li><button class="exercise-tile" type="button" data-exercise="${escapedExercise}">${escapedExercise}</button></li>`;
    })
    .join('')}</ul>`;
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
