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

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      currentCategory = {
        name: trimmed.replace(/^##\s+/, '').trim(),
        setsReps: '',
        exercises: [],
      };
      workout.categories.push(currentCategory);
      continue;
    }

    if (!currentCategory) {
      continue;
    }

    if (trimmed.startsWith('Sets x Reps:')) {
      currentCategory.setsReps = trimmed.replace(/^Sets x Reps:\s*/, '').trim();
      continue;
    }

    if (trimmed.startsWith('- ')) {
      currentCategory.exercises.push(trimmed.replace(/^-\s+/, '').trim());
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

async function loadWorkout(workoutId) {
  const workoutMeta = workouts.find((workout) => workout.id === workoutId) || workouts[0];
  showLoading();

  try {
    const response = await fetch(workoutMeta.file);

    if (!response.ok) {
      throw new Error(`Could not load ${workoutMeta.file}`);
    }

    const markdown = await response.text();
    currentWorkout = parseWorkoutMarkdown(markdown, workoutMeta.id);
    currentCategoryIndex = 0;
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

  const exercises = category.exercises.length
    ? `<ul class="exercise-list">${category.exercises.map((exercise) => `<li>${escapeHtml(exercise)}</li>`).join('')}</ul>`
    : '<p class="muted">No exercises listed for this category.</p>';

  container.innerHTML = `<section class="details-panel">
    <p class="eyebrow">${escapeHtml(currentWorkout.title)}</p>
    <h2>${escapeHtml(category.name)}</h2>
    <p class="sets-reps">${escapeHtml(category.setsReps ? formatSetsReps(category.setsReps) : 'No sets listed')}</p>
    ${exercises}
  </section>`;
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
  loadWorkout('strength');
}
