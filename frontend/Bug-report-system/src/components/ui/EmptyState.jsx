import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, action, actionLabel, onAction }) {
  return (
    <div className="empty-state animate-fade-in">
      {Icon && (
        <div className="empty-state-icon-wrap">
          <Icon size={32} strokeWidth={1.5} />
        </div>
      )}
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {(action || onAction) && (
        <Button variant="primary" size="auto" className="mt-6" onClick={onAction}>
          {action || actionLabel}
        </Button>
      )}
    </div>
  );
}
