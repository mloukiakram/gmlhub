import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input } from '../components/ui';
import { Terminal, ArrowRight } from 'lucide-react';

export default function Signup() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 4) {
            showToast('Password must be at least 4 characters', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/.netlify/functions/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                login(data.data.token, data.data.user);
                showToast('Account created successfully!', 'success');
                navigate('/tools/pmta-monitor');
            } else {
                showToast(data.message || 'Registration failed', 'error');
            }
        } catch (err) {
            showToast('Registration failed', 'error');
        } finally {
            setLoading(false);
        }
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
                        Start managing your<br />servers today.
                    </h1>
                    <p className="text-white/60 text-lg max-w-md">
                        Create your account and get instant access to all tools for PMTA management.
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
                        <h2 className="text-2xl font-bold text-[#1a1d21] mb-2">Create your account</h2>
                        <p className="text-[#5e6674]">Get started with GML Tools for free</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            required
                            autoFocus
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            required
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            required
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            loading={loading}
                            icon={ArrowRight}
                            iconPosition="right"
                        >
                            Create Account
                        </Button>
                    </form>

                    <p className="text-center mt-8 text-[#5e6674] text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#2563eb] hover:text-[#1d4ed8] font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
