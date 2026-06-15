import axios from 'axios';
import type { Contribution, ContributionsResponse } from '../types/database';

function toArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && typeof val === 'object' && Array.isArray((val as Record<string, unknown>).data))
    return (val as Record<string, unknown>).data as T[];
  return [];
}

export function normalizeContributions(raw: unknown): ContributionsResponse {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    repository:   (obj.repository   as ContributionsResponse['repository'])   ?? ({} as ContributionsResponse['repository']),
    total_commits: (obj.total_commits as number) ?? 0,
    contributions: toArray<Contribution>(obj.contributions ?? obj.data),
  };
}

export function toArrayResponse<T>(raw: unknown): T[] {
  return toArray<T>(raw);
}

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    // Envia/recebe o cookie HttpOnly que carrega o JWT. O token nunca passa pelo JS.
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

const PUBLIC_ROUTES = ['/login', '/register'];

const isPublicRoute = (url?: string) =>
    PUBLIC_ROUTES.some(route => url?.includes(route));

// O JWT viaja em cookie HttpOnly gerenciado pelo browser — o front não injeta mais
// o header Authorization. Só anexamos o X-Tenant-ID (necessário nas rotas públicas
// como o login e útil como defesa em profundidade nas protegidas).
api.interceptors.request.use((config) => {
    const tenantId = localStorage.getItem('graviton_tenant_id');
    if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
});

// 401 em rota protegida = cookie ausente/expirado → limpa o estado local e manda pro login.
// Não redireciona se já estiver no login, para evitar loop durante a validação inicial.
api.interceptors.response.use(
    response => response,
    error => {
        const isPublic = isPublicRoute(error.config?.url);
        if (!isPublic && error.response?.status === 401) {
            localStorage.removeItem('graviton_session');
            localStorage.removeItem('graviton_tenant_id');
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);
