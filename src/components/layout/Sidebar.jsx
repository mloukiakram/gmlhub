import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Copy,
    Sparkles,
    Trash2,
    Monitor,
    HardDrive,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Menu
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
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside
            className={`
                h-screen bg-white border-r border-[#e8ecf0] flex flex-col
                transition-all duration-300 ease-out
                ${collapsed ? 'w-[72px]' : 'w-[240px]'}
            `}
            style={{ boxShadow: '1px 0 0 rgba(0,0,0,0.02)' }}
        >
            {/* Header */}
            <div className={`h-16 flex items-center border-b border-[#e8ecf0] ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
                {!collapsed && (
                    <div className="flex items-center gap-3 animate-fade-in">
                        <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center">
                            <Menu size={18} className="text-white" />
                        </div>
                        <span className="font-semibold text-[#1a1d21] text-[15px]">GML Tools</span>
                    </div>
                )}
                {collapsed && (
                    <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center">
                        <Menu size={18} className="text-white" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={item.path}
                            to={`/tools/${item.path}`}
                            className={({ isActive }) => `
                                sidebar-link flex items-center gap-3 h-11 rounded-lg
                                transition-all duration-150
                                ${collapsed ? 'justify-center px-0' : 'px-3'}
                                ${isActive
                                    ? 'bg-[#eff6ff] text-[#2563eb] active'
                                    : 'text-[#5e6674] hover:bg-[#f8f9fa] hover:text-[#1a1d21]'
                                }
                            `}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <item.icon size={20} strokeWidth={1.75} />
                            {!collapsed && (
                                <span className="text-sm font-medium truncate">{item.label}</span>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="border-t border-[#e8ecf0] p-3 space-y-1">
                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`
                        w-full h-10 rounded-lg flex items-center gap-3
                        text-[#5e6674] hover:bg-[#f8f9fa] hover:text-[#1a1d21]
                        transition-all duration-150
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
                        text-[#5e6674] hover:bg-[#fef2f2] hover:text-[#ef4444]
                        transition-all duration-150
                        ${collapsed ? 'justify-center px-0' : 'px-3'}
                    `}
                >
                    <LogOut size={18} />
                    {!collapsed && <span className="text-sm font-medium">Logout</span>}
                </button>
            </div>

            {/* Version */}
            {!collapsed && (
                <div className="px-5 py-3 text-xs text-[#9ca3af]">
                    Version 4.0
                </div>
            )}
        </aside>
    );
}
