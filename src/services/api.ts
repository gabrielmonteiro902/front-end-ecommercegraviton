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
    baseURL: 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

const PUBLIC_ROUTES = ['/login', '/register'];

const isPublicRoute = (url?: string) =>
    PUBLIC_ROUTES.some(route => url?.includes(route));

// Injeta o Bearer token em todas as rotas protegidas
api.interceptors.request.use((config) => {
    const isPublic = isPublicRoute(config.url);
    if (!isPublic) {
        const raw = sessionStorage.getItem('graviton_session');
        if (raw) {
            try {
                const session = JSON.parse(raw);
                if (session?.access_token) {
                    config.headers.Authorization = `Bearer ${session.access_token}`;
                }
            } catch {
                sessionStorage.removeItem('graviton_session');
            }
        }
    }
    return config;
});

// Qualquer 401 em rota protegida = token expirado/inválido → limpa sessão e redireciona
api.interceptors.response.use(
    response => response,
    error => {
        const isPublic = isPublicRoute(error.config?.url);
        if (!isPublic && error.response?.status === 401) {
            sessionStorage.removeItem('graviton_session');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);
