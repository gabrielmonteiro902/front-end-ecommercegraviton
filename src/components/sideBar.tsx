import '../index.css';
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, LogOut, Menu, X, ChevronRight, Atom, Orbit } from 'lucide-react';
import GravitonLogo from './GravitonLogo';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    path: string;
    active: boolean;
    onClick: (path: string) => void;
}

const SidebarItem = ({ icon: Icon, label, path, active, onClick }: SidebarItemProps) => (
    <button
        onClick={() => onClick(path)}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 group ${
            active
                ? 'bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.08)]'
                : 'text-white/30 hover:text-white hover:bg-white/[0.05]'
        }`}
    >
        <Icon size={15} className="shrink-0" />
        <span className="text-[11px] font-black tracking-[0.18em] uppercase flex-1 text-left">
            {label}
        </span>
        {active && <ChevronRight size={13} className="ml-auto opacity-50" />}
    </button>
);

export default function Sidebar({ children }: { children: React.ReactNode }) {
    const [userName, setUserName] = useState<string>('...');
    const [isOpen, setIsOpen] = useState<boolean>(true);
    const navigate   = useNavigate();
    const location   = useLocation();
    const { logout } = useAuth();

    useEffect(() => {
        api.get('/me')
            .then(r => setUserName(r.data.name_admin))
            .catch(() => setUserName('Admin'));
    }, []);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Repositórios',    path: '/graviton-home'   },
        { icon: Atom,            label: 'Dois Corpos',     path: '/dois-corpos'     },
        { icon: Orbit,           label: 'Sist. Orbital',   path: '/sistema-orbital' },
        { icon: Settings,        label: 'Configurações',   path: '/settings'        },
    ];

    const handleLogout = async () => { await logout(); navigate('/'); };

    return (
        <div className="flex min-h-screen w-full bg-black text-white">

            {/* Mobile toggle */}
            <button
                className="fixed top-5 right-5 z-50 rounded-xl border border-white/10 bg-black/80 backdrop-blur-md p-2.5 lg:hidden"
                onClick={() => setIsOpen(v => !v)}
            >
                {isOpen
                    ? <X    size={17} className="text-white/50" />
                    : <Menu size={17} className="text-white/50" />
                }
            </button>

            {/* ── Aside ── */}
            <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/[0.07] bg-black overflow-hidden transition-transform duration-300 lg:translate-x-0 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>

                {/* Background layers */}
                <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
                     style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3 px-7 pt-9 pb-7">
                    <GravitonLogo size={34} showRing={false} />
                    <div>
                        <p className="font-black tracking-[0.32em] text-white text-[13px] uppercase leading-none">
                            GRAVITON
                        </p>
                        <p className="text-[9px] font-mono tracking-[0.22em] text-white/25 uppercase mt-1">
                            Infrastructure
                        </p>
                    </div>
                </div>

                {/* Separator */}
                <div className="relative z-10 mx-6 h-px bg-white/[0.06] mb-5" />

                {/* Nav */}
                <nav className="relative z-10 flex-1 flex flex-col px-3">
                    <p className="text-[9px] font-mono tracking-[0.28em] text-white/18 uppercase px-3 mb-2">
                        Navegação
                    </p>
                    <div className="flex flex-col gap-0.5">
                        {menuItems.map(item => (
                            <SidebarItem
                                key={item.path}
                                icon={item.icon}
                                label={item.label}
                                path={item.path}
                                active={location.pathname === item.path}
                                onClick={navigate}
                            />
                        ))}
                    </div>
                </nav>

                {/* User card */}
                <div className="relative z-10 p-4 pt-0">
                    <div className="h-px bg-white/[0.06] mb-4" />
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] border border-white/[0.08] font-black text-white/50 text-sm select-none">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="flex flex-1 flex-col overflow-hidden">
                            <span className="truncate text-[13px] font-black text-white tracking-tight">
                                {userName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div
                                    className="w-1.5 h-1.5 rounded-full bg-green-400"
                                    style={{ animation: 'twinkle 2.5s ease-in-out infinite' }}
                                />
                                <span className="text-[9px] font-mono tracking-[0.2em] text-white/25 uppercase">
                                    Online
                                </span>
                            </div>
                        </div>
                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="text-white/20 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/[0.05]"
                            title="Sair"
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                    <p className="text-[8px] font-mono text-white/10 tracking-[0.18em] uppercase mt-3 px-1">
                        GRV-SYS // ORB:443 // v1.0
                    </p>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 lg:ml-72">
                {children}
            </main>
        </div>
    );
}
