const TOKEN_KEY = 'greensupply_access_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getGoogleLoginUrl() {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing REACT_APP_SUPABASE_URL');
  }

  const redirectTo = window.location.origin;
  return `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
}

export function readTokenFromUrlHash() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) {
    return null;
  }

  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('access_token');
  if (token) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return token;
}
