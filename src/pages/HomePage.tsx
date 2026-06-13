import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Admin } from '../types/database';

export default function GravitonHome() {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/me');
                setAdmin(response.data);
            } catch (err) {
                const error = err as AxiosError;
                if (error.response?.status === 401) {
                    navigate('/');
                }
                console.error("Erro ao carregar perfil:", error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-gray-500 animate-pulse">Autenticando...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-black p-12">
            <header className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                    <h1 className="font-bold text-white tracking-tighter">
                        DASHBOARD<span className="text-gray-600">.</span>
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 hover:text-white transition-all cursor-pointer underline underline-offset-4"
                    >
                        Sair
                    </button>
                </div>

                {admin ? (
                    <div className="flex flex-col gap-1">
                        <h2 className="text-white">
                            Bem-vindo de volta, <span className="text-blue-500">{admin.name_admin}</span>!
                        </h2>
                        <p className="text-sm text-gray-500">
                            Você está logado como: {admin.email_admin}
                        </p>
                    </div>
                ) : (
                    <p className="text-red-500">Não foi possível carregar o perfil.</p>
                )}

                <div className="mt-4 h-1 w-16 bg-white rounded-full" />
            </header>

            <main className="mt-12">
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
                    <p className="text-gray-400">
                        O sistema Graviton está operacional. Suas ferramentas de gerenciamento aparecerão aqui.
                    </p>
                </div>
            </main>
        </div>
    );
}
