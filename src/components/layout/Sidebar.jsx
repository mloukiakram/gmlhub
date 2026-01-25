import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Copy,
    Sparkles,
    Trash2,
    Monitor,
    HardDrive,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Menu,
    Sun,
    Moon
} from 'lucide-react';

const navItems = [
    { path: 'vmta-duplicate', label: 'VMTA Duplicate', icon: Copy },
    { path: 'aura-remover', label: 'Aura Remover', icon: Sparkles },
    { path: 'bounce-cleaner', label: 'Bounce Cleaner', icon: Trash2 },
    { path: 'pmta-monitor', label: 'PMTA Monitor', icon: Monitor },
    { path: 'bucket-tool', label: 'Bucket Tool', icon: HardDrive },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside
            className={`
                h-screen border-r flex flex-col
                transition-all duration-300 ease-in-out
                bg-surface border-base
                ${collapsed ? 'w-[72px]' : 'w-[260px]'}
            `}
        >
            {/* Header */}
            <div className={`h-16 flex items-center border-b border-base ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
                {!collapsed && (
                    <div className="flex items-center gap-3 animate-fade-in">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Menu size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-main text-[16px] tracking-tight">GML Panel</span>
                    </div>
                )}
                {collapsed && (
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Menu size={18} className="text-white" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={item.path}
                            to={`/tools/${item.path}`}
                            className={({ isActive }) => `
                                flex items-center gap-3 h-11 rounded-lg mb-1
                                transition-all duration-200 font-medium
                                ${collapsed ? 'justify-center px-0' : 'px-3'}
                                ${isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                    : 'text-secondary hover:bg-surface-hover hover:text-main'
                                }
                            `}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Icon shown only when collapsed */}
                                    {collapsed && (
                                        <item.icon size={20} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-secondary'} />
                                    )}
                                    {/* Label shown only when expanded */}
                                    {!collapsed && (
                                        <span className="text-sm truncate pl-1">{item.label}</span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="border-t border-base p-3 space-y-1">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`
                        w-full h-10 rounded-lg flex items-center gap-3
                        text-secondary hover:bg-surface-hover hover:text-main
                        transition-all duration-200
                        ${collapsed ? 'justify-center px-0' : 'px-3'}
                    `}
                >
                    {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                    {!collapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
                </button>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`
                        w-full h-10 rounded-lg flex items-center gap-3
                        text-secondary hover:bg-surface-hover hover:text-main
                        transition-all duration-200
                        ${collapsed ? 'justify-center px-0' : 'px-3'}
                    `}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!collapsed && <span className="text-sm font-medium">Collapse</span>}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={`
                        w-full h-10 rounded-lg flex items-center gap-3
                        text-secondary hover:bg-red-50 hover:text-red-600
                        transition-all duration-200
                        ${collapsed ? 'justify-center px-0' : 'px-3'}
                    `}
                >
                    <LogOut size={18} />
                    {!collapsed && <span className="text-sm font-medium">Logout</span>}
                </button>
            </div>

            {/* Version */}
            {!collapsed && (
                <div className="px-5 py-3 text-[10px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest text-center">
                    v4.1.0 PREMIUM
                </div>
            )}
        </aside>
    );
}
