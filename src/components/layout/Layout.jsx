import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
    return (
        <div className="h-screen flex bg-base text-main overflow-hidden transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
