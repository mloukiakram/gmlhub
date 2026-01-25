import React from 'react';
import { Button } from './components/ui';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.state.error = error;
        this.state.errorInfo = errorInfo;
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full border border-red-100">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
                        <p className="text-slate-600 mb-6">The application crashed. Here is the error details:</p>

                        <div className="bg-slate-900 text-red-300 p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm mb-6">
                            <p className="font-bold border-b border-red-900/50 pb-2 mb-2">
                                {this.state.error?.toString()}
                            </p>
                            <pre>{this.state.errorInfo?.componentStack}</pre>
                        </div>

                        <Button onClick={() => window.location.href = '/'} variant="primary">
                            Reload Application
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
