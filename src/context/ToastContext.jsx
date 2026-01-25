import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast, index) => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={() => removeToast(toast.id)}
                        style={{ animationDelay: `${index * 50}ms` }}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function Toast({ message, type, onClose }) {
    const icons = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertCircle,
        info: Info,
    };

    const styles = {
        success: {
            bg: 'bg-[#10b981]',
            icon: 'text-white',
        },
        error: {
            bg: 'bg-[#ef4444]',
            icon: 'text-white',
        },
        warning: {
            bg: 'bg-[#f59e0b]',
            icon: 'text-white',
        },
        info: {
            bg: 'bg-[#2563eb]',
            icon: 'text-white',
        },
    };

    const Icon = icons[type] || icons.info;
    const style = styles[type] || styles.info;

    return (
        <div
            className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
                ${style.bg} text-white
                shadow-lg animate-fade-in-up
                min-w-[280px] max-w-[400px]
            `}
        >
            <Icon size={18} className={style.icon} />
            <span className="flex-1 text-sm font-medium">{message}</span>
            <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/20 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
