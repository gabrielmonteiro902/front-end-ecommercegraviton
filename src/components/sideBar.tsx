import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    ShieldCheck,
    Menu,
    X,
    ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

interface sidebarItemProps {
    icon: React.ElementType;
    label: string;
    path: string;
    active: boolean;
    onClick: (path: string) => void;
}

const SidebarItem = ({ icon: Icon, label, path, active, onClick }: sidebarItemProps) => (
    <button
        onClick={() => onClick(path)}
        className={`flex w-full items-centes gap-4 rounded-x1 p-4 transition-all duration-200 group
    ${active
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                : 'text-gray-500 hover:bg-gray-900 hover:text-while'
            }`}
    >
        <Icon className={`shrink-0 ${active ? 'text-black' : 'group-hover: text-while'}`} size={20} />
        <span className="font-medium tracking-tight">{label}</span>
        {active && <ChevronRight size={16} className='m1-auto' />}
    </button>
)

export default function Sidebar({ children }: { children: React.ReactNode }) {
    const [userName, setUserName] = useState<string>('carregando...')
    const [isOpen, setIsOpen] = useState<boolean>(true)
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const getProfile = async () => {
            try {
                const response = await api.get('/me');
                setUserName(response.data.name_admin)
            } catch (error) {
                console.error("Erro ao carregar o perfil do usuário:", error)
                setUserName("admin");
            }
        };

        getProfile();
    }, [])

    const menuItems = [
        { icons: LayoutDashboard, label: 'Dashboard', path: '/graviton-home' },
        { icons: Users, label: 'Administradores', path: '/admins' },
        { icons: Settings, label: 'Configurações', path: '/settings' },
    ];

    const handleNavigation = (path: string) => {
        navigate(path);
    }

    const handleLogout = () => {
        navigate('/');
    };

    return (
        <div className="flex min-h-screen w-full bg-black text-white">
            <button
                className="fixed top-6 right-6 z-50 rounded-full border border-gray-800 bg-gray-900 p-3 lg:hidden"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-gray-800 bg-black transition-transform duration-300 lg: translate-x-0
             ${isOpen ? 'translate-x-0' : '-translate-x-full'} `}
            >
                <div className="flex items-center gap-3 px-8 py-10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black">
                        <ShieldCheck size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-black tracking-tighter text-white uppercase">GRAVITON</h1>
                        <span className="font-bold uppercase tracking-[0.2em] text-gray-600 leading-none">
                            Infrastructure
                        </span>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 px-4">
                    {menuItems.map((item) =>
                        <SidebarItem
                            key={item.path}
                            icon={item.icons}
                            label={item.label}
                            path={item.path}
                            active={location.pathname === item.path}
                            onClick={handleNavigation}
                        />
                    )}
                </nav>
                <div className='border-t border-gray-800 p-4'>
                    <div className='flex items-center gap-3 rounded-2x1 border border-gray-800 bg-800 bg-gray-950 p-4'>
                        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800 font-bold text-gray-400'>
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className='flex flex-1 flex-col overflow-hidden'>
                            <span className='truncate font-bold text-white'>{userName}</span>
                            <span className='truncate text-gray-600 font-medium'>Online</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className='text-gray-600 hover:text-red-500 transition-colors'
                            title='Sair'
                        >
                            <LogOut size={10} />
                        </button>
                    </div>
                </div>
            </aside>

            <main className={`flex-1 transition-all duration-300 lg:ml-72`}>
                <div className="h-full w-full">
                    {children}
                </div>
            </main>ß
        </div>
    )
};