const STORAGE_KEYS = {
  habits: 'rituals_habits',
  goals: 'rituals_goals',
  journal: 'rituals_journal',
  profile: 'rituals_profile',
};

const JOURNAL_PROMPTS = [
  'What one small win are you most proud of today?',
  'What habit helped you move closer to your goal?',
  'What did you learn about yourself today?',
  'What challenge did you overcome today?',
  'What are you grateful for today?'
];

function loadData(key, fallback) {
  const current = localStorage.getItem(key);
  return current ? JSON.parse(current) : fallback;
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function setActiveNavLink() {
  const page = document.body.dataset.page;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href').includes(page));
  });
}

async function renderUserName() {
  const el = document.getElementById('user-name');
  if (!el) return;
  const name = await window.getCurrentUserName();
  el.textContent = name || 'Ritualist';
}

async function renderDashboard() {
  const habits = loadData(STORAGE_KEYS.habits, []);
  const goals = loadData(STORAGE_KEYS.goals, []);
  const journal = loadData(STORAGE_KEYS.journal, []);
  const completed = habits.filter(h => h.completedToday).length;
  const averageGoal = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0;
  const prompt = JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];

  document.getElementById('dashboard-habits-summary').textContent = habits.length
    ? `${completed} of ${habits.length} habits completed today.`
    : 'No habits yet. Create a habit to start your streaks.';

  document.getElementById('dashboard-goals-summary').textContent = goals.length
    ? `${averageGoal}% average progress across ${goals.length} active goal(s).`
    : 'No goals yet. Add one to start tracking progress.';

  document.getElementById('dashboard-journal-prompt').textContent = prompt;
  document.getElementById('stat-completed-habits').textContent = completed;
  document.getElementById('stat-goals-progress').textContent = `${averageGoal}%`;
  document.getElementById('stat-journal-entries').textContent = journal.length;
}

function renderHabits() {
  const habits = loadData(STORAGE_KEYS.habits, []);
  const list = document.getElementById('habits-list');
  const summary = document.getElementById('habits-summary');

  list.innerHTML = '';
  if (!habits.length) {
    summary.textContent = 'No habits added yet. Add one above to get started.';
    list.innerHTML = '<div class="empty-state">Your habit list is empty.</div>';
    return;
  }

  summary.textContent = `${habits.length} habit(s) in your routine.`;
  habits.forEach(habit => {
    const item = document.createElement('article');
    item.className = 'item-card';
    item.innerHTML = `
      <div>
        <div class="item-heading">
          <h3>${habit.title}</h3>
          <span class="pill ${habit.completedToday ? 'pill-success' : 'pill-muted'}">${habit.completedToday ? 'Completed' : 'Pending'}</span>
        </div>
        <p class="item-copy">${habit.description || 'No description added.'}</p>
        <div class="item-meta">Streak: <strong>${habit.streak || 0}</strong> day(s)</div>
      </div>
      <div class="item-actions">
        <button type="button" class="btn-secondary" onclick="toggleHabitComplete('${habit.id}')">${habit.completedToday ? 'Undo' : 'Mark done'}</button>
        <button type="button" class="btn-secondary" onclick="editHabit('${habit.id}')">Edit</button>
        <button type="button" class="btn-secondary btn-danger" onclick="deleteHabit('${habit.id}')">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function addHabit() {
  const title = document.getElementById('habit-title').value.trim();
  const description = document.getElementById('habit-desc').value.trim();
  if (!title) return alert('Please enter a habit name.');

  const habits = loadData(STORAGE_KEYS.habits, []);
  habits.push({
    id: generateId(),
    title,
    description,
    streak: 0,
    completedToday: false,
    createdAt: new Date().toISOString(),
  });
  saveData(STORAGE_KEYS.habits, habits);
  document.getElementById('habit-title').value = '';
  document.getElementById('habit-desc').value = '';
  renderHabits();
}

function toggleHabitComplete(id) {
  const habits = loadData(STORAGE_KEYS.habits, []);
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  habit.completedToday = !habit.completedToday;
  habit.streak = habit.completedToday ? (habit.streak || 0) + 1 : Math.max(0, (habit.streak || 0) - 1);
  saveData(STORAGE_KEYS.habits, habits);
  renderHabits();
}

function deleteHabit(id) {
  if (!confirm('Delete this habit?')) return;
  const habits = loadData(STORAGE_KEYS.habits, []).filter(h => h.id !== id);
  saveData(STORAGE_KEYS.habits, habits);
  renderHabits();
}

function editHabit(id) {
  const habits = loadData(STORAGE_KEYS.habits, []);
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  const title = prompt('Update habit name', habit.title);
  if (!title) return;
  const description = prompt('Update habit description', habit.description) || habit.description;
  habit.title = title.trim();
  habit.description = description.trim();
  saveData(STORAGE_KEYS.habits, habits);
  renderHabits();
}

function renderGoals() {
  const goals = loadData(STORAGE_KEYS.goals, []);
  const list = document.getElementById('goals-list');
  const summary = document.getElementById('goals-summary');
  list.innerHTML = '';

  if (!goals.length) {
    summary.textContent = 'No goals yet. Add a goal to start tracking milestones.';
    list.innerHTML = '<div class="empty-state">No active goals.</div>';
    return;
  }

  summary.textContent = `${goals.length} active goal(s).`;
  goals.forEach(goal => {
    const progress = goal.progress || 0;
    const deadlineText = goal.deadline ? formatDate(goal.deadline) : 'No deadline';
    const milestonesHtml = goal.milestones.length
      ? goal.milestones.map(m => `<li class="milestone ${m.done ? 'milestone-done' : ''}"><span>${m.title}</span><button type="button" class="btn-small" onclick="toggleMilestone('${goal.id}','${m.id}')">${m.done ? 'Undo' : 'Done'}</button></li>`).join('')
      : '<li class="empty-state">No milestones yet.</li>';

    const item = document.createElement('article');
    item.className = 'item-card';
    item.innerHTML = `
      <div>
        <div class="item-heading">
          <h3>${goal.title}</h3>
          <span class="pill ${progress >= 100 ? 'pill-success' : 'pill-muted'}">${progress}%</span>
        </div>
        <p class="item-copy">Deadline: ${deadlineText}</p>
        <div class="progress-bar"><span style="width:${Math.min(progress,100)}%"></span></div>
        <ul class="milestone-list">${milestonesHtml}</ul>
      </div>
      <div class="item-actions">
        <button type="button" class="btn-secondary" onclick="addMilestone('${goal.id}')">Add milestone</button>
        <button type="button" class="btn-secondary btn-danger" onclick="deleteGoal('${goal.id}')">Delete goal</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function addGoal() {
  const title = document.getElementById('goal-title').value.trim();
  const deadline = document.getElementById('goal-deadline').value;
  if (!title) return alert('Enter a goal title.');

  const goals = loadData(STORAGE_KEYS.goals, []);
  goals.push({
    id: generateId(),
    title,
    deadline: deadline || null,
    progress: 0,
    milestones: [],
    createdAt: new Date().toISOString(),
  });
  saveData(STORAGE_KEYS.goals, goals);
  document.getElementById('goal-title').value = '';
  document.getElementById('goal-deadline').value = '';
  renderGoals();
}

function addMilestone(goalId) {
  const goals = loadData(STORAGE_KEYS.goals, []);
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const title = prompt('Milestone title');
  if (!title) return;
  goal.milestones.push({ id: generateId(), title: title.trim(), done: false });
  recomputeGoalProgress(goal);
  saveData(STORAGE_KEYS.goals, goals);
  renderGoals();
}

function toggleMilestone(goalId, milestoneId) {
  const goals = loadData(STORAGE_KEYS.goals, []);
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const milestone = goal.milestones.find(m => m.id === milestoneId);
  if (!milestone) return;
  milestone.done = !milestone.done;
  recomputeGoalProgress(goal);
  saveData(STORAGE_KEYS.goals, goals);
  renderGoals();
}

function recomputeGoalProgress(goal) {
  if (!goal.milestones.length) {
    goal.progress = 0;
    return;
  }
  const complete = goal.milestones.filter(m => m.done).length;
  goal.progress = Math.round((complete / goal.milestones.length) * 100);
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  const goals = loadData(STORAGE_KEYS.goals, []).filter(g => g.id !== id);
  saveData(STORAGE_KEYS.goals, goals);
  renderGoals();
}

function renderJournal() {
  const entries = loadData(STORAGE_KEYS.journal, []);
  const list = document.getElementById('journal-list');
  const summary = document.getElementById('journal-summary');
  const dateInput = document.getElementById('journal-date');

  dateInput.value = todayString();
  summary.textContent = `${entries.length} saved entr${entries.length === 1 ? 'y' : 'ies'}.`;
  list.innerHTML = '';

  if (!entries.length) {
    list.innerHTML = '<div class="empty-state">No journal entries yet. Start writing to capture your progress.</div>';
    return;
  }

  entries.slice().reverse().forEach(entry => {
    const item = document.createElement('article');
    item.className = 'item-card';
    item.innerHTML = `
      <div>
        <div class="item-heading">
          <h3>${formatDate(entry.date)}</h3>
          <span class="pill pill-muted">${entry.mood || 'No mood'}</span>
        </div>
        <p class="item-copy">${entry.text || 'No entry text.'}</p>
      </div>
      <div class="item-actions">
        <button type="button" class="btn-secondary btn-danger" onclick="deleteJournal('${entry.date}')">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function saveJournal() {
  const date = document.getElementById('journal-date').value;
  const mood = document.getElementById('journal-mood').value;
  const text = document.getElementById('journal-entry').value.trim();
  if (!date) return alert('Select a date for this entry.');
  if (!text) return alert('Write something before saving.');

  const entries = loadData(STORAGE_KEYS.journal, []);
  const existing = entries.find(e => e.date === date);
  if (existing) {
    existing.mood = mood;
    existing.text = text;
  } else {
    entries.push({ date, mood, text, createdAt: new Date().toISOString() });
  }
  saveData(STORAGE_KEYS.journal, entries);
  renderJournal();
  document.getElementById('journal-entry').value = '';
}

function clearJournal() {
  document.getElementById('journal-entry').value = '';
  document.getElementById('journal-mood').value = '';
}

function deleteJournal(date) {
  if (!confirm('Delete this journal entry?')) return;
  const entries = loadData(STORAGE_KEYS.journal, []).filter(e => e.date !== date);
  saveData(STORAGE_KEYS.journal, entries);
  renderJournal();
}

async function renderProfile() {
  const profile = loadData(STORAGE_KEYS.profile, {});
  const habits = loadData(STORAGE_KEYS.habits, []);
  const goals = loadData(STORAGE_KEYS.goals, []);
  const journal = loadData(STORAGE_KEYS.journal, []);

  const name = profile.name || await window.getCurrentUserName();
  const email = profile.email || await window.getCurrentUserEmail();
  document.getElementById('profile-name').value = name;
  document.getElementById('profile-email').textContent = email;

  document.getElementById('profile-longest-streak').textContent = habits.reduce((max, habit) => Math.max(max, habit.streak || 0), 0);
  document.getElementById('profile-goals-completed').textContent = goals.filter(goal => goal.progress >= 100).length;
  document.getElementById('profile-journal-count').textContent = journal.length;
}

function saveProfile() {
  const name = document.getElementById('profile-name').value.trim();
  if (!name) return alert('Enter your name.');
  const emailText = document.getElementById('profile-email').textContent;
  const profile = { name, email: emailText };
  saveData(STORAGE_KEYS.profile, profile);
  alert('Profile saved.');
}

async function requirePageAuth() {
  if (window.isDemoMode && window.isDemoMode()) {
    const demoCurrent = localStorage.getItem('rituals_demo_current');
    if (!demoCurrent) {
      window.location.href = '../index.html';
      return;
    }
    return;
  }
  try {
    const sb = await getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) window.location.href = '../index.html';
  } catch (_) {
    const demoCurrent = localStorage.getItem('rituals_demo_current');
    if (!demoCurrent) window.location.href = '../index.html';
  }
}

async function initPage() {
  setActiveNavLink();
  await requirePageAuth();
  await renderUserName();
  const page = document.body.dataset.page;

  if (page === 'dashboard') renderDashboard();
  if (page === 'habits') renderHabits();
  if (page === 'goals') renderGoals();
  if (page === 'journal') renderJournal();
  if (page === 'profile') renderProfile();
}

window.addEventListener('DOMContentLoaded', initPage);
