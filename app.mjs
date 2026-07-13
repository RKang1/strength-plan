const workouts = [
  { id: 'day1', label: 'Day 1 · Power', file: 'day-1.md' },
  { id: 'day2', label: 'Day 2 · Strength', file: 'day-2.md' },
];

let currentWorkout = null;
let currentPhaseIndex = -1;
let currentCategoryIndex = -1;
let activeExercise = '';
let activeExerciseTrigger = null;
let activeModalKeydownHandler = null;

export function parseWorkoutMarkdown(markdown, id) {
  const lines = markdown.split(/\r?\n/);
  const titleLine = lines.find((line) => line.startsWith('# '));
  const workout = {
    id,
    title: titleLine ? titleLine.replace(/^#\s+/, '').trim() : 'Workout',
    phases: [],
  };

  let currentPhase = null;
  let currentCategory = null;
  let currentExerciseGroup = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#### ')) {
      if (!currentCategory) {
        continue;
      }

      currentExerciseGroup = {
        name: trimmed.replace(/^####\s+/, '').trim(),
        exercises: [],
      };

      if (!currentCategory.exerciseGroups) {
        currentCategory.exerciseGroups = [];
      }

      currentCategory.exerciseGroups.push(currentExerciseGroup);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      if (!currentPhase) {
        continue;
      }

      currentCategory = {
        name: trimmed.replace(/^###\s+/, '').trim(),
        setsReps: '',
        exercises: [],
      };
      currentExerciseGroup = null;
      currentPhase.categories.push(currentCategory);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      currentPhase = {
        name: trimmed.replace(/^##\s+/, '').trim(),
        categories: [],
      };
      currentCategory = null;
      currentExerciseGroup = null;
      workout.phases.push(currentPhase);
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

export function resolvePhaseIndex(phases, phaseSlug) {
  if (!phaseSlug) {
    return -1;
  }

  const index = phases.findIndex((phase) => slugifyCategory(phase.name) === phaseSlug);
  return index >= 0 ? index : -1;
}

export function getNextCategoryIndex(currentIndex, selectedIndex) {
  return currentIndex === selectedIndex ? -1 : selectedIndex;
}

export function getUrlState(windowLike = globalThis.window) {
  if (!windowLike?.location) {
    return {
      day: '',
      phase: '',
      category: '',
    };
  }

  const params = new URLSearchParams(windowLike.location.search);
  return {
    day: params.get('day') || '',
    phase: params.get('phase') || '',
    category: params.get('category') || '',
  };
}

export function getInitialWorkoutState(search = globalThis.window?.location?.search || '') {
  const params = new URLSearchParams(search);
  const requestedDay = params.get('day') || '';
  const day = workouts.some((workout) => workout.id === requestedDay) ? requestedDay : workouts[0].id;

  return {
    day,
    phase: params.get('phase') || '',
    category: params.get('category') || '',
  };
}

export function buildWorkoutUrl(currentUrl, day, phaseSlug, categorySlug) {
  const url = new URL(currentUrl);
  url.searchParams.set('day', day);

  if (phaseSlug) {
    url.searchParams.set('phase', phaseSlug);
  } else {
    url.searchParams.delete('phase');
  }

  if (phaseSlug && categorySlug) {
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

async function loadWorkout(workoutId, requestedPhaseSlug = '', requestedCategorySlug = '') {
  const workoutMeta = workouts.find((workout) => workout.id === workoutId) || workouts[0];
  showLoading();

  try {
    const response = await fetch(workoutMeta.file);

    if (!response.ok) {
      throw new Error(`Could not load ${workoutMeta.file}`);
    }

    const markdown = await response.text();
    currentWorkout = parseWorkoutMarkdown(markdown, workoutMeta.id);
    currentPhaseIndex = resolvePhaseIndex(currentWorkout.phases, requestedPhaseSlug);
    const activePhase = currentWorkout.phases[currentPhaseIndex];
    currentCategoryIndex = activePhase ? resolveCategoryIndex(activePhase.categories, requestedCategorySlug) : -1;
    updateUrlState();
    render();
  } catch (error) {
    showError(error.message);
  }
}

function showLoading() {
  const phaseList = document.querySelector('[data-phase-list]');

  if (phaseList) {
    phaseList.innerHTML = '<p class="muted">Loading workout...</p>';
  }
}

function showError(message) {
  const phaseList = document.querySelector('[data-phase-list]');

  if (phaseList) {
    phaseList.innerHTML = `<div class="empty-state"><h2>Unable to load workout</h2><p>${escapeHtml(message)}</p></div>`;
  }
}

function render() {
  renderDaySelector();
  renderPhaseList();
}

function updateUrlState() {
  if (!globalThis.window?.history || !currentWorkout) {
    return;
  }

  const phase = currentWorkout.phases[currentPhaseIndex];
  const phaseSlug = phase ? slugifyCategory(phase.name) : '';
  const category = phase ? phase.categories[currentCategoryIndex] : null;
  const categorySlug = category ? slugifyCategory(category.name) : '';
  const nextUrl = buildWorkoutUrl(globalThis.window.location.href, currentWorkout.id, phaseSlug, categorySlug);
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

function renderPhaseList() {
  const container = document.querySelector('[data-phase-list]');

  if (!container || !currentWorkout) {
    return;
  }

  container.innerHTML = renderPhaseListHtml(currentWorkout.phases, currentPhaseIndex, currentCategoryIndex);

  container.querySelectorAll('[data-phase-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const phaseIndex = Number(button.dataset.phaseIndex);
      currentPhaseIndex = getNextCategoryIndex(currentPhaseIndex, phaseIndex);
      currentCategoryIndex = -1;
      updateUrlState();
      renderPhaseList();
      // The click target was replaced by the re-render; keep keyboard focus on it.
      container.querySelector(`[data-phase-index="${phaseIndex}"]`)?.focus();
    });
  });

  container.querySelectorAll('[data-category-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const categoryIndex = Number(button.dataset.categoryIndex);
      currentCategoryIndex = getNextCategoryIndex(currentCategoryIndex, categoryIndex);
      updateUrlState();
      renderPhaseList();
      // The click target was replaced by the re-render; keep keyboard focus on it.
      container.querySelector(`[data-category-index="${categoryIndex}"]`)?.focus();
    });
  });

  container.querySelectorAll('[data-exercise]').forEach((button) => {
    button.addEventListener('click', () => {
      showExerciseModal(button.dataset.exercise, button);
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
        <button class="category-button" id="${buttonId}" type="button" data-category-index="${index}" aria-expanded="${isActive}"${isActive ? ` aria-controls="${panelId}"` : ''}>
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

export function renderPhaseListHtml(phases, activePhaseIndex, activeCategoryIndex) {
  if (!phases.length) {
    return '<div class="empty-state"><h2>No phases found</h2><p>Add phases to the selected Markdown file.</p></div>';
  }

  return phases
    .map((phase, index) => {
      const isActive = index === activePhaseIndex;
      const panelId = `phase-panel-${index}`;
      const buttonId = `phase-button-${index}`;
      const count = phase.categories.length;
      const countLabel = `${count} ${count === 1 ? 'category' : 'categories'}`;

      return `<section class="phase-item${isActive ? ' is-active' : ''}">
        <button class="phase-button" id="${buttonId}" type="button" data-phase-index="${index}" aria-expanded="${isActive}"${isActive ? ` aria-controls="${panelId}"` : ''}>
          <span>${escapeHtml(phase.name)}</span>
          <small>${escapeHtml(countLabel)}</small>
        </button>
        ${isActive ? `<div class="phase-panel" id="${panelId}" role="region" aria-labelledby="${buttonId}">
          ${renderCategoryListHtml(phase.categories, activeCategoryIndex)}
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

function showExerciseModal(exercise, triggerElement) {
  activeExercise = exercise;
  activeExerciseTrigger = triggerElement;
  renderExerciseModal();
}

function closeExerciseModal({ restoreFocus = true } = {}) {
  const modal = document.querySelector('[data-exercise-modal]');

  if (modal) {
    modal.remove();
  }

  if (activeModalKeydownHandler) {
    document.removeEventListener('keydown', activeModalKeydownHandler);
    activeModalKeydownHandler = null;
  }

  activeExercise = '';

  if (restoreFocus && activeExerciseTrigger?.focus) {
    activeExerciseTrigger.focus();
  }

  activeExerciseTrigger = null;
}

function openExerciseOnYoutube() {
  if (!activeExercise) {
    return;
  }

  const url = buildYoutubeSearchUrl(activeExercise);
  globalThis.window?.open?.(url, '_blank', 'noopener');
  closeExerciseModal({ restoreFocus: false });
}

function renderExerciseModal() {
  document.querySelector('[data-exercise-modal]')?.remove();

  if (activeModalKeydownHandler) {
    document.removeEventListener('keydown', activeModalKeydownHandler);
    activeModalKeydownHandler = null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'modal-backdrop';
  wrapper.dataset.exerciseModal = '';
  wrapper.innerHTML = `<div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title">
    <h2 id="exercise-modal-title">View &quot;${escapeHtml(activeExercise)}&quot; on YouTube?</h2>
    <div class="modal-actions">
      <button class="modal-button" type="button" data-modal-cancel>Cancel</button>
      <button class="modal-button is-primary" type="button" data-modal-confirm>YouTube</button>
    </div>
  </div>`;

  wrapper.addEventListener('click', (event) => {
    if (event.target === wrapper) {
      closeExerciseModal();
    }
  });

  wrapper.querySelector('[data-modal-cancel]').addEventListener('click', () => closeExerciseModal());
  wrapper.querySelector('[data-modal-confirm]').addEventListener('click', openExerciseOnYoutube);

  activeModalKeydownHandler = (event) => {
    if (event.key === 'Escape') {
      closeExerciseModal();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = Array.from(
      wrapper.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((element) => !element.disabled && element.getAttribute('aria-hidden') !== 'true');

    if (!focusableElements.length) {
      event.preventDefault();
      return;
    }

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusableElement) {
      event.preventDefault();
      lastFocusableElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastFocusableElement) {
      event.preventDefault();
      firstFocusableElement.focus();
    }
  };

  document.addEventListener('keydown', activeModalKeydownHandler);
  document.body.append(wrapper);
  wrapper.querySelector('[data-modal-confirm]').focus();
}

if (typeof document !== 'undefined') {
  const initialState = getInitialWorkoutState();
  loadWorkout(initialState.day, initialState.phase, initialState.category);
}
