import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input } from '../components/ui';
import { Terminal, ArrowRight } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = await login(username, password);

        if (result.success) {
            toast('Welcome back!', 'success');
            navigate('/tools/pmta-monitor');
        } else {
            toast(result.message || 'Login failed', 'error');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#fafbfc] flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#1a1d21] flex-col justify-between p-12">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Terminal size={20} className="text-white" />
                        </div>
                        <span className="text-white font-semibold text-lg">GML Tools</span>
                    </div>
                </div>

                <div className="animate-fade-in-up">
                    <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                        Manage your PMTA<br />infrastructure with ease.
                    </h1>
                    <p className="text-white/60 text-lg max-w-md">
                        Monitor sessions, manage IPs, and streamline your email delivery operations all in one place.
                    </p>
                </div>

                <div className="text-white/40 text-sm">
                    © 2026 GML Tools. All rights reserved.
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-[400px] animate-fade-in">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-[#2563eb] flex items-center justify-center">
                            <Terminal size={20} className="text-white" />
                        </div>
                        <span className="font-semibold text-lg text-[#1a1d21]">GML Tools</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-[#1a1d21] mb-2">Welcome back</h2>
                        <p className="text-[#5e6674]">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            autoFocus
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            loading={loading}
                            icon={ArrowRight}
                            iconPosition="right"
                        >
                            Sign In
                        </Button>
                    </form>

                    <p className="text-center mt-8 text-[#5e6674] text-sm">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-[#2563eb] hover:text-[#1d4ed8] font-medium transition-colors">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
