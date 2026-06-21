const URLS = {
  auth: 'https://functions.poehali.dev/932741da-d9ea-4b7e-8312-0f9ec0fc3ee0',
  citizens: 'https://functions.poehali.dev/9d48834b-8dad-427d-ab0b-f99911e3188a',
  documents: 'https://functions.poehali.dev/e9c34e80-8e67-4610-8b65-b3505bce000e',
  logs: 'https://functions.poehali.dev/adeffd56-8e3e-4379-92f2-9f652df20f90',
};

function getToken() {
  return localStorage.getItem('archive_token') || '';
}

async function req(base: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getToken(),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    req(URLS.auth, '/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => req(URLS.auth, '/me'),
  logout: () => req(URLS.auth, '/logout', { method: 'POST' }),
  getUsers: () => req(URLS.auth, '/users'),
  createUser: (data: { username: string; password: string; full_name: string; role: string }) =>
    req(URLS.auth, '/users', { method: 'POST', body: JSON.stringify(data) }),
};

// Citizens
export const citizensApi = {
  list: (search = '', archived = false) =>
    req(URLS.citizens, `/?search=${encodeURIComponent(search)}&archived=${archived}`),
  create: (data: Record<string, string>) =>
    req(URLS.citizens, '/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, string>) =>
    req(URLS.citizens, `/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleArchive: (id: number) =>
    req(URLS.citizens, `/${id}/archive`, { method: 'POST', body: '{}' }),
};

// Documents
export const documentsApi = {
  all: () => req(URLS.documents, '/'),
  byCitizen: (citizenId: number) => req(URLS.documents, `/?citizen_id=${citizenId}`),
  upload: (data: { citizen_id: number; name: string; size: number; data: string }) =>
    req(URLS.documents, '/', { method: 'POST', body: JSON.stringify(data) }),
  remove: (docId: number) =>
    req(URLS.documents, `/${docId}/remove`, { method: 'POST', body: '{}' }),
};

// Logs
export const logsApi = {
  list: () => req(URLS.logs, '/'),
};
