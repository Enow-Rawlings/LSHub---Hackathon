/**
 * Central API helper for VouchPass client.
 * Attaches the JWT from localStorage automatically.
 * On 401, calls logout and redirects to /login.
 */
const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('vp_token');
}

export function setToken(token) {
  localStorage.setItem('vp_token', token);
}

export function clearToken() {
  localStorage.removeItem('vp_token');
  localStorage.removeItem('vp_user');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    // Redirect to login only in browser context
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status  = res.status;
    err.details = data.errors;
    throw err;
  }

  return data;
}

// Auth
export const auth = {
  register:   (body)       => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:      (body)       => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  verifyOtp:  (body)       => request('/auth/verify-otp',{ method: 'POST', body: JSON.stringify(body) }),
  google:     (body)       => request('/auth/google',   { method: 'POST', body: JSON.stringify(body) }),
};

// Workers
export const workers = {
  createProfile: (body)   => request('/workers',           { method: 'POST', body: JSON.stringify(body) }),
  getMyProfile:  ()       => request('/workers/me'),
  updateProfile: (body)   => request('/workers/me',        { method: 'PUT',  body: JSON.stringify(body) }),
  search:        (params) => request('/workers/search?' + new URLSearchParams(params)),
  getPassport:   (id)     => request(`/workers/passport/${id}`),
  uploadPhoto:   (file)   => {
    const token = getToken();
    const form  = new FormData();
    form.append('photo', file);
    // Can't use the request() helper here because we need multipart/form-data (no Content-Type header)
    return fetch(`${BASE}/workers/me/photo`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    }).then(async r => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(data.error || 'Upload failed'); e.status = r.status; throw e; }
      return data;
    });
  },
};

// Jobs
export const jobs = {
  create:  (body)   => request('/jobs',              { method: 'POST', body: JSON.stringify(body) }),
  mine:    ()       => request('/jobs/mine'),
  accept:  (id)     => request(`/jobs/${id}/accept`, { method: 'PUT' }),
  decline: (id)     => request(`/jobs/${id}/decline`,{ method: 'PUT' }),
  start:   (id, body) => request(`/jobs/${id}/start`,{ method: 'POST', body: JSON.stringify(body) }),
  confirm: (id, body) => request(`/jobs/${id}/confirm`,{ method: 'POST', body: JSON.stringify(body) }),
  cancel:  (id)     => request(`/jobs/${id}/cancel`, { method: 'PUT' }),
};

// Vouches and skill checks
export const verifier = {
  vouch:     (body) => request('/vouches',    { method: 'POST', body: JSON.stringify(body) }),
  skillCheck:(body) => request('/skillchecks',{ method: 'POST', body: JSON.stringify(body) }),
};

// Bot
export const bot = {
  send: (body) => request('/bot/web', { method: 'POST', body: JSON.stringify(body) }),
};

export default { auth, workers, jobs, verifier, bot };
