const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function messageForStatus(status: number): string {
  if (status === 400) return 'Confira os dados informados e tente novamente.';
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 404) return 'O registro solicitado não foi encontrado.';
  if (status === 409) return 'Este e-mail já está cadastrado.';
  if (status >= 500) return 'O servidor apresentou um erro. Tente novamente mais tarde.';
  return 'Não foi possível concluir a solicitação.';
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new ApiError(500, 'Configure VITE_API_URL no arquivo .env e reinicie o app.');
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem('crm_access_token');
  if (token && !path.startsWith('/auth/login')) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(500, 'Não foi possível conectar ao servidor. Verifique se a API está ligada.');
  }

  if (response.status === 401 && !path.startsWith('/auth/login')) {
    window.dispatchEvent(new Event('crm:unauthorized'));
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const message = typeof body.message === 'string'
      ? body.message
      : typeof body.error === 'string'
        ? body.error
        : messageForStatus(response.status);
    throw new ApiError(response.status, message);
  }
  return payload as T;
}

export const jsonBody = (value: unknown) => JSON.stringify(value);
