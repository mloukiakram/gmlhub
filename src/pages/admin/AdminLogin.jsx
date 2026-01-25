import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, Lock, AlertCircle } from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();

        // Specific hardcoded credentials check
        if (username === 'ADMIN' && password === 'ADMIN@gml-2026') {
            // Store simple admin session
            localStorage.setItem('admin_session', 'true');
            localStorage.setItem('admin_key', 'ADMIN@gml-2026'); // Store key for API calls
            navigate('/admin-panel');
        } else {
            setError('Invalid Administration Credentials');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base p-4 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-30">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            </div>

            <Card className="w-full max-w-md p-8 relative z-10 border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20">
                        <Shield className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-main tracking-tight">Admin Portal</h1>
                    <p className="text-secondary text-sm font-medium mt-1">Restricted Access Only</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <Input
                        label="Admin User"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        icon={Key}
                        placeholder="ADMIN"
                        required
                        className="font-mono"
                    />

                    <Input
                        label="Secure Key"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={Lock}
                        placeholder="••••••••••••••••"
                        required
                        className="font-mono"
                    />

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                        Authenticate
                    </Button>
                </form>
            </Card>
        </div>
    );
}
