// Determine API base: in dev Vite proxies /api to port 4000; fallback direct to http://localhost:4000 if accessed directly
const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('appointmo_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    // If relative /api failed (e.g. running on static server without proxy), attempt direct port 4000 fallback
    if (API_BASE === '/api' && !window.location.port.includes('4000')) {
      try {
        res = await fetch(`http://localhost:4000/api${endpoint}`, {
          ...options,
          headers,
        });
      } catch (fallbackErr) {
        throw new Error('Cannot connect to Appointmo API backend. Please ensure the backend server is running on port 4000.');
      }
    } else {
      throw new Error(netErr?.message || 'Network request failed. Please check your backend connection.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Server responded with error status ${res.status}`);
  }

  return data;
}
