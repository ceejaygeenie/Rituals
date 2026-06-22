// ============================================================
//  AUTH.JS — Handles login, signup, Google OAuth
// ============================================================

const DEMO_USERS_KEY = 'rituals_demo_users';
const DEMO_CURRENT_KEY = 'rituals_demo_current';

function isDemoMode() {
  return SUPABASE_URL.includes('YOUR_SUPABASE_URL') || SUPABASE_KEY.includes('YOUR_SUPABASE_ANON_KEY');
}

function getDemoUsers() {
  return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '{}');
}

function saveDemoUsers(users) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

function setDemoCurrent(email) {
  localStorage.setItem(DEMO_CURRENT_KEY, email);
}

function getDemoCurrent() {
  return localStorage.getItem(DEMO_CURRENT_KEY);
}

function clearDemoCurrent() {
  localStorage.removeItem(DEMO_CURRENT_KEY);
}

function getDemoUserName() {
  const email = getDemoCurrent();
  const users = getDemoUsers();
  return (users[email] && users[email].name) || 'Ritualist';
}

function demoSignUp(name, email, password) {
  const users = getDemoUsers();
  if (users[email]) return { error: { message: 'That email is already registered.' } };
  users[email] = { name, password };
  saveDemoUsers(users);
  setDemoCurrent(email);
  return { data: { user: { email, user_metadata: { full_name: name } } } };
}

function demoSignIn(email, password) {
  const users = getDemoUsers();
  if (users[email] && users[email].password === password) {
    setDemoCurrent(email);
    return { data: { user: { email, user_metadata: { full_name: users[email].name } } } };
  }
  return { error: { message: 'Email or password is incorrect.' } };
}

window.getCurrentUserName = async function() {
  if (isDemoMode()) return getDemoUserName();
  try {
    const sb = await getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    return session?.user?.user_metadata?.full_name || session?.user?.email || 'Ritualist';
  } catch (_) {
    return getDemoUserName();
  }
};

window.getCurrentUserEmail = async function() {
  if (isDemoMode()) return getDemoCurrent() || 'demo@rituals.app';
  try {
    const sb = await getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    return session?.user?.email || 'Email not available';
  } catch (_) {
    return getDemoCurrent() || 'Email not available';
  }
};

window.logout = async function() {
  if (isDemoMode()) {
    clearDemoCurrent();
    window.location.href = '../index.html';
    return;
  }
  try {
    const sb = await getSupabase();
    await sb.auth.signOut();
  } catch (_) {}
  window.location.href = '../index.html';
};

// ---- Tab switching ----
function switchTab(tab) {
  const tabs     = document.querySelectorAll('.tab');
  const loginEl  = document.getElementById('form-login');
  const signupEl = document.getElementById('form-signup');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup= document.getElementById('tab-signup');

  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'login') {
    tabLogin.classList.add('active');
    loginEl.classList.remove('hidden');
    signupEl.classList.add('hidden');
  } else {
    tabSignup.classList.add('active');
    signupEl.classList.remove('hidden');
    loginEl.classList.add('hidden');
  }
}

// ---- Password strength meter ----
const pwdInput = document.getElementById('signup-password');
if (pwdInput) {
  pwdInput.addEventListener('input', () => {
    const val = pwdInput.value;
    let score = 0;
    if (val.length >= 8)                   score++;
    if (/[A-Z]/.test(val))                score++;
    if (/[0-9]/.test(val))                score++;
    if (/[^A-Za-z0-9]/.test(val))         score++;

    const bars   = [1,2,3,4].map(n => document.getElementById('bar' + n));
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const classes= ['', 'weak', 'fair', 'good', 'strong'];

    bars.forEach((bar, i) => {
      bar.className = 'bar';
      if (i < score) bar.classList.add(classes[score]);
    });

    document.getElementById('strength-label').textContent = labels[score] || '';
  });
}

// ---- Helpers ----
function setLoading(btnEl, loading) {
  const text   = btnEl.querySelector('.btn-text');
  const loader = btnEl.querySelector('.btn-loader');
  if (loading) {
    btnEl.disabled = true;
    text.classList.add('hidden');
    loader.classList.remove('hidden');
  } else {
    btnEl.disabled = false;
    text.classList.remove('hidden');
    loader.classList.add('hidden');
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---- Login ----
async function handleLogin() {
  hideError('login-error');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.querySelector('#form-login .btn-primary');

  if (!email || !password) {
    return showError('login-error', 'Please fill in all fields.');
  }
  if (!isValidEmail(email)) {
    return showError('login-error', 'Enter a valid email address.');
  }

  setLoading(btn, true);
  try {
    if (isDemoMode()) {
      const { data, error } = demoSignIn(email, password);
      if (error) {
        showError('login-error', error.message || 'Sign in failed. Try again.');
      } else {
        window.location.href = './pages/dashboard.html';
      }
    } else {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        showError('login-error', error.message || 'Sign in failed. Try again.');
      } else {
        window.location.href = './pages/dashboard.html';
      }
    }
  } catch (err) {
    showError('login-error', 'Something went wrong. Check your connection.');
  } finally {
    setLoading(btn, false);
  }
}

// ---- Signup ----
async function handleSignup() {
  hideError('signup-error');
  hideError('signup-success');

  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const btn      = document.querySelector('#form-signup .btn-primary');

  if (!name || !email || !password) {
    return showError('signup-error', 'Please fill in all fields.');
  }
  if (!isValidEmail(email)) {
    return showError('signup-error', 'Enter a valid email address.');
  }
  if (password.length < 8) {
    return showError('signup-error', 'Password must be at least 8 characters.');
  }

  setLoading(btn, true);
  try {
    if (isDemoMode()) {
      const { data, error } = demoSignUp(name, email, password);
      if (error) {
        showError('signup-error', error.message || 'Sign up failed. Try again.');
      } else {
        showSuccess('signup-success', `Welcome, ${name}! Redirecting to your dashboard...`);
        setTimeout(() => {
          window.location.href = './pages/dashboard.html';
        }, 800);
      }
    } else {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      });

      if (error) {
        showError('signup-error', error.message || 'Sign up failed. Try again.');
      } else {
        showSuccess('signup-success', `Welcome! Check your email at ${email} to verify your account, then sign in.`);
        document.getElementById('form-signup').querySelectorAll('input').forEach(i => i.value = '');
      }
    }
  } catch (err) {
    showError('signup-error', 'Something went wrong. Check your connection.');
  } finally {
    setLoading(btn, false);
  }
}

// ---- Google OAuth ----
async function handleGoogleAuth() {
  try {
    if (isDemoMode()) {
      demoSignUp('Demo user', 'demo@rituals.app', 'demo-password');
      window.location.href = './pages/dashboard.html';
      return;
    }

    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/pages/dashboard.html' }
    });
    if (error) alert('Google sign-in failed: ' + error.message);
  } catch (err) {
    alert('Something went wrong. Please try again.');
  }
}

// ---- Auto-redirect if already logged in ----
(async () => {
  try {
    if (isDemoMode()) {
      if (getDemoCurrent()) window.location.href = './pages/dashboard.html';
      return;
    }

    const sb = await getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (session) window.location.href = './pages/dashboard.html';
  } catch (_) {
    if (getDemoCurrent()) window.location.href = './pages/dashboard.html';
  }
})();
