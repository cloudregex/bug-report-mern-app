import { ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';

export default function PageShell({ backLabel, onBack, title, badge, actions, children, wide = false, noPadding = false }) {
  return (
    <div className={`page-shell ${wide ? 'page-shell-wide' : ''} ${noPadding ? '' : 'page-shell-padded'}`}>
      {(backLabel || title || actions) && (
        <div className="page-shell-header animate-fade-up">
          <div className="page-shell-header-left">
            {backLabel && (
              <Button variant="pill" size="sm" onClick={onBack} icon={ArrowLeft}>
                {backLabel}
              </Button>
            )}
            {title && <h2 className="page-shell-title">{title}</h2>}
            {badge}
          </div>
          {actions && <div className="page-shell-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
