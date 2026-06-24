import { AlertCircle } from 'lucide-react';

export default function ErrorBanner({ children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`error-banner animate-fade-in ${className}`}>
      <AlertCircle size={16} strokeWidth={2.25} className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}
