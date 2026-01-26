import { X } from 'lucide-react';

// ===== BUTTON =====
export function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-base focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:bg-[#1e40af]',
        secondary: 'bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] active:bg-[#d1d5db]',
        outline: 'border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb] active:bg-[#f3f4f6]',
        ghost: 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151]',
        danger: 'bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c]',
        success: 'bg-[#10b981] text-white hover:bg-[#059669] active:bg-[#047857]',
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading ? (
                <span className="spinner spinner-sm" />
            ) : (
                <>
                    {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
                    {children}
                    {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
                </>
            )}
        </button>
    );
}

// ===== ICON BUTTON =====
export function IconButton({
    icon: Icon,
    variant = 'ghost',
    size = 'md',
    className = '',
    ...props
}) {
    const variants = {
        ghost: 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151]',
        outline: 'border border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#374151]',
        primary: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
    };

    const sizes = {
        sm: 'w-7 h-7',
        md: 'w-9 h-9',
        lg: 'w-11 h-11',
    };

    return (
        <button
            className={`inline-flex items-center justify-center rounded-lg transition-base focus-ring ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        </button>
    );
}

// ===== CARD =====
export function Card({ children, className = '', hover = false, padding = 'md', ...props }) {
    const paddings = {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
    };

    return (
        <div
            className={`
                bg-white border border-[#e8ecf0] rounded-xl
                ${paddings[padding]}
                ${hover ? 'card-hover cursor-pointer' : ''}
                ${className}
            `}
            style={{ boxShadow: 'var(--shadow-sm)' }}
            {...props}
        >
            {children}
        </div>
    );
}

// ===== MODAL =====
export function Modal({ isOpen, onClose, title, children, size = 'md', showClose = true }) {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[90vw]',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="modal-backdrop fixed inset-0" onClick={onClose} />
            <div className={`modal-content relative bg-white rounded-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
                style={{ boxShadow: 'var(--shadow-lg)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8ecf0]">
                    <h2 className="text-lg font-semibold text-[#1a1d21]">{title}</h2>
                    {showClose && (
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-base"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ===== CONFIRM MODAL =====
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger', loading = false }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="modal-backdrop fixed inset-0" onClick={onClose} />
            <div className="modal-content relative bg-white rounded-2xl w-full max-w-sm p-6"
                style={{ boxShadow: 'var(--shadow-lg)' }}>
                <h3 className="text-lg font-semibold text-[#1a1d21] mb-2">{title}</h3>
                <p className="text-[#5e6674] text-sm mb-6">{message}</p>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button variant={variant} onClick={onConfirm} loading={loading} className="flex-1">
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ===== BADGE =====
export function Badge({ children, variant = 'neutral', className = '' }) {
    return (
        <span className={`badge badge-${variant} ${className}`}>
            {children}
        </span>
    );
}

// ===== INPUT =====
export function Input({ label, error, className = '', ...props }) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                    {label}
                </label>
            )}
            <input
                className={`
                    w-full h-11 px-4 bg-white border rounded-lg text-sm text-[#1a1d21]
                    placeholder:text-[#64748b]
                    ${error ? 'border-[#ef4444]' : 'border-slate-300'}
                `}
                {...props}
            />
            {error && <p className="mt-1.5 text-xs text-[#ef4444]">{error}</p>}
        </div>
    );
}

// ===== TEXTAREA =====
export function Textarea({ label, error, className = '', ...props }) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                    {label}
                </label>
            )}
            <textarea
                className={`
                    w-full px-4 py-3 bg-white border rounded-lg text-sm text-[#1a1d21] resize-none
                    placeholder:text-[#64748b]
                    ${error ? 'border-[#ef4444]' : 'border-slate-300'}
                `}
                {...props}
            />
            {error && <p className="mt-1.5 text-xs text-[#ef4444]">{error}</p>}
        </div>
    );
}

// ===== SKELETON =====
export function Skeleton({ className = '', variant = 'text' }) {
    const variants = {
        text: 'h-4 rounded',
        title: 'h-6 rounded',
        avatar: 'w-10 h-10 rounded-full',
        button: 'h-10 w-24 rounded-lg',
        card: 'h-32 rounded-xl',
    };

    return <div className={`skeleton ${variants[variant]} ${className}`} />;
}

// ===== SPINNER =====
export function Spinner({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'spinner-sm',
        md: '',
        lg: 'spinner-lg',
    };

    return <div className={`spinner ${sizes[size]} ${className}`} />;
}

// ===== EMPTY STATE =====
export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            {Icon && (
                <div className="w-16 h-16 rounded-2xl bg-[#f3f4f6] flex items-center justify-center mb-4">
                    <Icon size={28} className="text-[#9ca3af]" />
                </div>
            )}
            <h3 className="text-lg font-medium text-[#374151] mb-1">{title}</h3>
            {description && <p className="text-sm text-[#6b7280] max-w-sm">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

// ===== DIVIDER =====
export function Divider({ className = '' }) {
    return <div className={`h-px bg-[#e8ecf0] ${className}`} />;
}

// ===== TOOLTIP =====
export function Tooltip({ children, content }) {
    return (
        <div className="relative group">
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#1f2937] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {content}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1f2937]" />
            </div>
        </div>
    );
}
