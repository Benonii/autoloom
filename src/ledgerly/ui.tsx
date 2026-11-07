import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#15803d] text-white hover:bg-[#166534]',
  secondary: 'border border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]',
  ghost: 'text-[#475569] hover:bg-[#f1f5f9]',
  danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
};

interface LedgerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function LedgerButton({ variant = 'primary', className = '', type = 'button', ...props }: LedgerButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  isWide?: boolean;
}

export function Modal({ title, description, onClose, children, isWide = false }: ModalProps) {
  return (
    <div className='fixed inset-0 z-40 grid place-items-center bg-[#0f172a]/40 p-4'>
      <div
        role='dialog'
        aria-modal='true'
        aria-label={title}
        className={`w-full rounded-2xl bg-white p-6 shadow-2xl ${isWide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className='mb-5 flex items-start justify-between gap-4'>
          <div>
            <h2 className='text-lg font-bold text-[#0f172a]'>{title}</h2>
            {description && <p className='mt-1 text-sm text-[#64748b]'>{description}</p>}
          </div>
          <button
            type='button'
            aria-label='Close'
            onClick={onClose}
            className='rounded-md px-2 text-[#64748b] hover:bg-[#f1f5f9]'
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className='flex flex-col gap-1.5 text-sm font-medium text-[#334155]'>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className='rounded-lg border border-[#cbd5e1] px-3 py-2 text-[#0f172a] outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#bbf7d0]'
      />
    </label>
  );
}

export function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Paid: 'bg-[#dcfce7] text-[#166534]',
    Sent: 'bg-[#dbeafe] text-[#1e40af]',
    Draft: 'bg-[#f1f5f9] text-[#475569]',
    Overdue: 'bg-[#fee2e2] text-[#991b1b]',
    Pending: 'bg-[#fef9c3] text-[#854d0e]',
    Connected: 'bg-[#dcfce7] text-[#166534]'
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[status] ?? colors.Draft}`}>
      {status}
    </span>
  );
}
