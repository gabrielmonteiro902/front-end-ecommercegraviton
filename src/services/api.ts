import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

const PUBLIC_ROUTES = ['/login', '/register'];

// Injeta o Bearer token em todas as rotas protegidas
api.interceptors.request.use((config) => {
    const isPublic = PUBLIC_ROUTES.some(route => config.url === route);
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
        const isPublic = PUBLIC_ROUTES.some(route => error.config?.url === route);
        if (!isPublic && error.response?.status === 401) {
            sessionStorage.removeItem('graviton_session');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);
