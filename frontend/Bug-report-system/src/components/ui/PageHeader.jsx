import Badge from './Badge';

export default function PageHeader({ title, subtitle, badge, badgeVariant = 'open', actions }) {
  return (
    <div className="page-header animate-fade-up">
      <div>
        <h1 className="section-title">{title}</h1>
        {subtitle && <p className="section-sub">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {badge !== undefined && <Badge variant={badgeVariant}>{badge}</Badge>}
        {actions}
      </div>
    </div>
  );
}
