// Minimal shared helpers. No framework, no build step — kept easy to
// read and easy to swap out later.

const ACCESS_TOKEN_KEY = 'ctf_access_token';
const REFRESH_TOKEN_KEY = 'ctf_refresh_token';

// NOTE: localStorage is used here for simplicity in this first pass.
// It's readable by any JS on the page, so it's worth revisiting later
// (e.g. an httpOnly cookie) once XSS-surface on this UI is reviewed.
export function saveTokens({ accessToken, refreshToken }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function rawFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/auth${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// Wraps rawFetch with one transparent refresh-and-retry: the access token
// only lives 15 minutes, so on a 401 we spend the refresh token once to
// get a new pair before giving up, instead of forcing a re-login.
export async function apiFetch(path, options = {}) {
  let { res, data } = await rawFetch(path, options);

  if (res.status === 401 && path !== '/refresh' && getRefreshToken()) {
    const refreshed = await rawFetch('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    });

    if (refreshed.res.ok) {
      saveTokens(refreshed.data);
      ({ res, data } = await rawFetch(path, options));
    } else {
      clearTokens();
    }
  }

  if (!res.ok) throw new Error(data.error || 'request failed');
  return data;
}

export function showMessage(el, text, type = 'error') {
  el.textContent = text;
  el.className = `message ${type}`;
}

// Simple guest/auth page guards, called from each page.
export function redirectIfAuthed(to = '/profile.html') {
  if (getAccessToken()) window.location.href = to;
}
export function redirectIfGuest(to = '/login.html') {
  if (!getAccessToken()) window.location.href = to;
}
