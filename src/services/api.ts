import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const raw = sessionStorage.getItem('graviton_session');
    if (raw) {
        const session = JSON.parse(raw);
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
    }
    return config;
});
