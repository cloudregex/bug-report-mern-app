import { Bug } from 'lucide-react';

export default function AuthLayout({ children, title, subtitle, icon: Icon = Bug, shake = false }) {
  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-top" />
      <div className="auth-glow auth-glow-bottom" />

      <div className={`auth-container animate-scale-in ${shake ? 'animate-shake' : ''}`}>
        <div className="auth-brand">
          <div className="auth-logo">
            <Icon size={22} strokeWidth={2.5} />
          </div>
          <h1 className="auth-brand-title">{title}</h1>
          {subtitle && <p className="auth-brand-sub">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
