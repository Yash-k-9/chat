// Inline message box. tone: 'error' | 'success' | 'warning' | 'info'
import { AlertIcon, CheckIcon, InfoIcon } from './Icons.jsx';

const TONES = {
  error: { box: 'bg-danger-soft text-danger', Icon: AlertIcon },
  success: { box: 'bg-success-soft text-success', Icon: CheckIcon },
  warning: { box: 'bg-warning-soft text-warning', Icon: AlertIcon },
  info: { box: 'bg-accent-soft text-accent-text', Icon: InfoIcon },
};

export default function Alert({ tone = 'error', children, className = '' }) {
  const { box, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex animate-fade-in items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm ${box} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
